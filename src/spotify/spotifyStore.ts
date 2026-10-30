// Spotify settings live apart from the game save, so save codes never carry login tokens.
import { isObject } from '../util/typeGuards.ts'
import type { SpotifyTokens } from './spotifyAuth.ts'

const STORAGE_KEY = 'pomodoro-garden-spotify'

export interface ChosenPlaylist {
  uri: string
  name: string
}

export interface SpotifyState {
  tokens: SpotifyTokens | null
  playlist: ChosenPlaylist | null
  // The player's own volume, kept while the music is ducked between sessions.
  rememberedVolume: number | null
}


function cleanTokens(value: unknown): SpotifyTokens | null {
  if (!isObject(value)) return null
  const { accessToken, refreshToken, expiresAt } = value
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || !Number.isFinite(expiresAt)) return null
  return { accessToken, refreshToken, expiresAt }
}

function cleanPlaylist(value: unknown): ChosenPlaylist | null {
  if (!isObject(value) || typeof value.uri !== 'string' || !/^spotify:playlist:[A-Za-z0-9]+$/.test(value.uri)) return null
  return { uri: value.uri, name: String(value.name ?? 'Playlist').slice(0, 200) }
}

function cleanVolume(value: unknown): number | null {
  return Number.isFinite(value) && (value as number) >= 0 && (value as number) <= 100 ? (value as number) : null
}

export function parseSpotifyState(raw: string | null): SpotifyState {
  try {
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      tokens: cleanTokens(parsed.tokens),
      playlist: cleanPlaylist(parsed.playlist),
      rememberedVolume: cleanVolume(parsed.rememberedVolume),
    }
  } catch {
    return { tokens: null, playlist: null, rememberedVolume: null }
  }
}

export function loadSpotifyState(): SpotifyState {
  return parseSpotifyState(localStorage.getItem(STORAGE_KEY))
}

export function saveSpotifyState(state: SpotifyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
