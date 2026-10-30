// Connects the Spotify pieces to the game: login, the chosen playlist, and the music
// rules around each focus session. Spotify problems never stop the timer; they only
// change the status line shown on the radio.
import {
  authorizeUrl,
  codeChallenge,
  exchangeCode,
  isExpired,
  makeCodeVerifier,
  readCallback,
  refreshTokens,
} from './spotifyAuth.ts'
import { SpotifyError, getDevices, getPlayback, getPlaylists, play, setVolume, type Playlist } from './spotifyApi.ts'
import { focusEndVolume, focusStartAction, focusStartVolume } from './music.ts'
import { loadSpotifyState, saveSpotifyState, type ChosenPlaylist, type SpotifyState } from './spotifyStore.ts'

// From the Spotify developer dashboard. Public by design: the PKCE login needs no secret.
export const SPOTIFY_CLIENT_ID: string = 'd5a26176fc5a49a6ab8664024ea34ed5'

const LOGIN_KEY = 'pomodoro-garden-spotify-login'

const ERROR_MESSAGES: Record<SpotifyError['kind'], string> = {
  'signed-out': 'Spotify signed you out. Connect again to keep the music going.',
  'premium-required': 'Spotify Premium is needed for the garden to play your music.',
  'no-device': 'Open Spotify on your phone or computer, then plant again.',
  unavailable: "Spotify isn't responding right now. Your timer still works.",
}

// Where Spotify sends the player back to: this page's address, without any query.
const redirectUri = () => new URL(import.meta.env.BASE_URL, location.origin).href

export interface Spotify {
  isSetUp: () => boolean
  isConnected: () => boolean
  playlist: () => ChosenPlaylist | null
  status: () => string
  connect: () => Promise<void>
  // True when the page was just opened by Spotify sending the player back.
  finishLogin: () => Promise<boolean>
  disconnect: () => void
  listPlaylists: () => Promise<Playlist[]>
  choosePlaylist: (playlist: ChosenPlaylist) => void
  focusStart: () => Promise<void>
  focusEnd: () => Promise<void>
  // A short line about the current song, for the radio's speech bubble.
  nowPlaying: () => Promise<string>
  // Asks Spotify whether music is playing; listeners hear about changes.
  checkPlaying: () => Promise<void>
  onPlayingChange: (listener: (playing: boolean) => void) => void
}

// How long a "now playing" answer is reused, so hovering doesn't hammer Spotify.
const NOW_PLAYING_CACHE_MS = 5_000

export function createSpotify(): Spotify {
  let state: SpotifyState = loadSpotifyState()
  let lastProblem = ''

  const update = (changes: Partial<SpotifyState>) => {
    state = { ...state, ...changes }
    saveSpotifyState(state)
  }

  const fail = (error: unknown) => {
    lastProblem = error instanceof SpotifyError ? ERROR_MESSAGES[error.kind] : ERROR_MESSAGES.unavailable
    if (error instanceof SpotifyError && error.kind === 'signed-out') update({ tokens: null })
  }

  // A valid access token, refreshed if it has run out.
  const token = async (): Promise<string> => {
    if (!state.tokens) throw new SpotifyError('signed-out')
    if (isExpired(state.tokens, Date.now())) {
      try {
        update({ tokens: await refreshTokens(SPOTIFY_CLIENT_ID, state.tokens, Date.now()) })
      } catch {
        throw new SpotifyError('signed-out')
      }
    }
    return state.tokens!.accessToken
  }

  let nowPlayingCache = { text: '', at: 0 }

  let playing = false
  const playingListeners: ((playing: boolean) => void)[] = []
  const setPlaying = (value: boolean) => {
    if (value === playing) return
    playing = value
    playingListeners.forEach((listener) => listener(playing))
  }

  const describeNowPlaying = async (): Promise<string> => {
    if (SPOTIFY_CLIENT_ID === '') return "Spotify isn't set up yet."
    if (!state.tokens) return 'Connect Spotify on the radio to play music while you grow.'
    try {
      const playback = await getPlayback(await token())
      setPlaying(playback?.isPlaying === true)
      if (!playback?.isPlaying || !playback.track) return 'Nothing playing right now.'
      const { name, artists } = playback.track
      return artists ? `${name} — ${artists}` : name
    } catch (error) {
      fail(error)
      return "Couldn't reach Spotify just now."
    }
  }

  return {
    // A background check: failures are ignored rather than shown on the radio.
    checkPlaying: async () => {
      if (!state.tokens) return setPlaying(false)
      try {
        const playback = await getPlayback(await token())
        setPlaying(playback?.isPlaying === true)
      } catch {
        // Leave the notes as they are; the next check will try again.
      }
    },

    onPlayingChange: (listener) => {
      playingListeners.push(listener)
    },

    nowPlaying: async () => {
      if (Date.now() - nowPlayingCache.at < NOW_PLAYING_CACHE_MS) return nowPlayingCache.text
      nowPlayingCache = { text: await describeNowPlaying(), at: Date.now() }
      return nowPlayingCache.text
    },

    isSetUp: () => SPOTIFY_CLIENT_ID !== '',
    isConnected: () => state.tokens !== null,
    playlist: () => state.playlist,

    status: () => {
      if (SPOTIFY_CLIENT_ID === '') return "Spotify isn't set up yet."
      if (!state.tokens) return lastProblem || 'Connect Spotify to play music while you grow.'
      if (lastProblem) return lastProblem
      if (!state.playlist) return 'Choose a playlist to play while you grow.'
      return `Playing ${state.playlist.name} while you grow.`
    },

    // Step 1 of the login: remember a secret verifier for this tab, then go to Spotify.
    connect: async () => {
      const verifier = makeCodeVerifier()
      const loginState = makeCodeVerifier(24)
      sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ verifier, loginState }))
      location.assign(authorizeUrl(SPOTIFY_CLIENT_ID, redirectUri(), await codeChallenge(verifier), loginState))
    },

    // Step 2: back from Spotify. Checks the state matches this tab's login, then trades the code.
    finishLogin: async () => {
      const callback = readCallback(location.href)
      if (!callback) return false
      history.replaceState(null, '', redirectUri())
      const pending = JSON.parse(sessionStorage.getItem(LOGIN_KEY) ?? 'null')
      sessionStorage.removeItem(LOGIN_KEY)
      if ('error' in callback) {
        lastProblem = 'Spotify connection was cancelled.'
        return true
      }
      if (!pending || pending.loginState !== callback.state) {
        lastProblem = "That Spotify login didn't come from this page, so it was ignored."
        return true
      }
      try {
        const tokens = await exchangeCode(SPOTIFY_CLIENT_ID, redirectUri(), callback.code, pending.verifier, Date.now())
        update({ tokens })
        lastProblem = ''
      } catch {
        lastProblem = "Couldn't finish connecting to Spotify. Please try again."
      }
      return true
    },

    disconnect: () => {
      update({ tokens: null, playlist: null, rememberedVolume: null })
      lastProblem = ''
      setPlaying(false)
    },

    listPlaylists: async () => {
      try {
        const playlists = await getPlaylists(await token())
        lastProblem = ''
        return playlists
      } catch (error) {
        fail(error)
        return []
      }
    },

    choosePlaylist: (playlist) => {
      update({ playlist })
      lastProblem = ''
    },

    focusStart: async () => {
      if (!state.tokens || !state.playlist) return
      try {
        const accessToken = await token()
        const playback = await getPlayback(accessToken)
        const action = focusStartAction(playback, state.playlist.uri)
        if (action !== 'nothing') {
          // With nothing active, wake the first device Spotify knows about.
          const deviceId = playback?.device.id ?? (await getDevices(accessToken))[0]?.id
          if (!deviceId) throw new SpotifyError('no-device')
          await play(accessToken, { deviceId, contextUri: action === 'play-playlist' ? state.playlist.uri : undefined })
        }
        const volume = focusStartVolume(state.rememberedVolume, playback)
        if (volume !== null && playback) await setVolume(accessToken, volume, playback.device.id)
        update({ rememberedVolume: null })
        lastProblem = ''
      } catch (error) {
        fail(error)
      }
    },

    focusEnd: async () => {
      if (!state.tokens || state.rememberedVolume !== null) return
      try {
        const accessToken = await token()
        const playback = await getPlayback(accessToken)
        const volume = focusEndVolume(playback)
        if (volume && playback) {
          await setVolume(accessToken, volume.set, playback.device.id)
          update({ rememberedVolume: volume.remember })
        }
      } catch (error) {
        fail(error)
      }
    },
  }
}
