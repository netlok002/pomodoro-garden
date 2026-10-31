import { describe, it, expect } from 'vitest'
import { fakeFetch } from '../testing/fakeFetch.ts'
import { SpotifyError, getDevices, getPlayback, getPlaylists, moveHere, play, setVolume } from './spotifyApi.ts'


describe('getPlaylists', () => {
  it("lists the player's playlists with the access token", async () => {
    const { fetchFn, calls } = fakeFetch(200, {
      items: [
        { id: 'p1', name: 'Deep Focus', uri: 'spotify:playlist:p1' },
        { id: 'p2', name: 'Rain Sounds', uri: 'spotify:playlist:p2' },
      ],
    })
    expect(await getPlaylists('tok', fetchFn)).toEqual([
      { id: 'p1', name: 'Deep Focus', uri: 'spotify:playlist:p1' },
      { id: 'p2', name: 'Rain Sounds', uri: 'spotify:playlist:p2' },
    ])
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/playlists?limit=50')
    expect(calls[0].auth).toBe('Bearer tok')
  })

  it('skips empty entries Spotify sometimes returns', async () => {
    const { fetchFn } = fakeFetch(200, { items: [null, { id: 'p1', name: 'A', uri: 'spotify:playlist:p1' }] })
    expect(await getPlaylists('tok', fetchFn)).toHaveLength(1)
  })
})

describe('getPlayback', () => {
  it('describes what is playing and on which device', async () => {
    const { fetchFn } = fakeFetch(200, {
      is_playing: true,
      context: { uri: 'spotify:playlist:p1' },
      device: { id: 'd1', name: 'Desk', type: 'Computer', volume_percent: 70, supports_volume: true },
    })
    expect(await getPlayback('tok', fetchFn)).toEqual({
      isPlaying: true,
      contextUri: 'spotify:playlist:p1',
      device: { id: 'd1', name: 'Desk', type: 'Computer', volumePercent: 70, supportsVolume: true },
      track: null,
    })
  })

  it('includes the song and its artists', async () => {
    const { fetchFn } = fakeFetch(200, {
      is_playing: true,
      device: { id: 'd1', name: 'Desk', type: 'Computer', volume_percent: 70, supports_volume: true },
      item: { name: 'Weightless', artists: [{ name: 'Marconi Union' }, { name: 'Guest' }] },
    })
    expect((await getPlayback('tok', fetchFn))?.track).toEqual({ name: 'Weightless', artists: 'Marconi Union, Guest' })
  })

  it('gives null when nothing is playing anywhere', async () => {
    const { fetchFn } = fakeFetch(204)
    expect(await getPlayback('tok', fetchFn)).toBeNull()
  })
})

describe('getDevices', () => {
  it('lists devices the player could play on', async () => {
    const { fetchFn } = fakeFetch(200, {
      devices: [{ id: 'd1', name: 'iPhone', type: 'Smartphone', is_active: false, volume_percent: 50, supports_volume: false }],
    })
    expect(await getDevices('tok', fetchFn)).toEqual([
      { id: 'd1', name: 'iPhone', type: 'Smartphone', volumePercent: 50, supportsVolume: false },
    ])
  })
})

describe('play', () => {
  it('starts a playlist on a chosen device', async () => {
    const { fetchFn, calls } = fakeFetch(204)
    await play('tok', { contextUri: 'spotify:playlist:p1', deviceId: 'd1' }, fetchFn)
    expect(calls[0].method).toBe('PUT')
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player/play?device_id=d1')
    expect(JSON.parse(calls[0].body!)).toEqual({ context_uri: 'spotify:playlist:p1' })
  })

  it('resumes whatever was paused when no playlist is given', async () => {
    const { fetchFn, calls } = fakeFetch(204)
    await play('tok', {}, fetchFn)
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player/play')
    expect(calls[0].body).toBeUndefined()
  })
})

describe('moveHere', () => {
  it('moves playback to a device and keeps it playing from the same spot', async () => {
    const { fetchFn, calls } = fakeFetch(204)
    await moveHere('tok', 'phone1', fetchFn)
    expect(calls[0].method).toBe('PUT')
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player')
    expect(JSON.parse(calls[0].body!)).toEqual({ device_ids: ['phone1'], play: true })
  })
})

describe('setVolume', () => {
  it('sets the volume on a device', async () => {
    const { fetchFn, calls } = fakeFetch(204)
    await setVolume('tok', 35, 'd1', fetchFn)
    expect(calls[0].method).toBe('PUT')
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player/volume?volume_percent=35&device_id=d1')
  })
})

describe('errors', () => {
  it('explains the common Spotify failures', async () => {
    const kindOf = async (status: number) => {
      try {
        await play('tok', {}, fakeFetch(status).fetchFn)
      } catch (error) {
        return (error as SpotifyError).kind
      }
    }
    expect(await kindOf(401)).toBe('signed-out')
    expect(await kindOf(403)).toBe('premium-required')
    expect(await kindOf(404)).toBe('no-device')
    expect(await kindOf(500)).toBe('unavailable')
  })
})
