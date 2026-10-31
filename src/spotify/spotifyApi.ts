// The handful of Spotify Web API calls the app makes. Every call takes the access token
// and a fetch function, so tests can stand in a fake Spotify.
import type { FetchFn } from './spotifyAuth.ts'

const API = 'https://api.spotify.com/v1'

export interface Playlist {
  id: string
  name: string
  uri: string
}

export interface Device {
  id: string
  name: string
  // "Computer", "Smartphone", "Speaker" and so on, as Spotify reports it.
  type: string
  volumePercent: number
  supportsVolume: boolean
}

export interface Track {
  name: string
  artists: string
}

export interface Playback {
  isPlaying: boolean
  contextUri: string | null
  device: Device
  track: Track | null
}

// Songs have artists; podcast episodes and ads may not, so everything is optional here.
const toTrack = (item: any): Track | null =>
  item?.name
    ? {
        name: String(item.name),
        artists: (item.artists ?? []).map((artist: any) => artist?.name).filter(Boolean).join(', '),
      }
    : null

// What went wrong, in terms the Settings tab can explain to the player.
export type SpotifyErrorKind = 'signed-out' | 'premium-required' | 'no-device' | 'phone-asleep' | 'unavailable'

export class SpotifyError extends Error {
  kind: SpotifyErrorKind

  constructor(kind: SpotifyErrorKind) {
    super(`Spotify request failed: ${kind}`)
    this.kind = kind
  }
}

function errorKind(status: number): SpotifyErrorKind {
  if (status === 401) return 'signed-out'
  if (status === 403) return 'premium-required'
  if (status === 404) return 'no-device'
  return 'unavailable'
}

async function request(token: string, path: string, fetchFn: FetchFn, init: RequestInit = {}): Promise<Response> {
  const response = await fetchFn(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (!response.ok) throw new SpotifyError(errorKind(response.status))
  return response
}

const toDevice = (device: any): Device => ({
  id: device.id,
  name: String(device.name ?? 'Spotify device'),
  type: String(device.type ?? 'Unknown'),
  volumePercent: device.volume_percent ?? 0,
  supportsVolume: device.supports_volume === true,
})

export async function getPlaylists(token: string, fetchFn: FetchFn = fetch): Promise<Playlist[]> {
  const reply = await (await request(token, '/me/playlists?limit=50', fetchFn)).json()
  return (reply.items ?? [])
    .filter((item: any) => item?.id && item?.uri)
    .map((item: any) => ({ id: item.id, name: String(item.name ?? 'Untitled'), uri: item.uri }))
}

// null means nothing is playing on any of the player's devices.
export async function getPlayback(token: string, fetchFn: FetchFn = fetch): Promise<Playback | null> {
  const response = await request(token, '/me/player', fetchFn)
  if (response.status === 204) return null
  const reply = await response.json()
  if (!reply?.device) return null
  return {
    isPlaying: reply.is_playing === true,
    contextUri: reply.context?.uri ?? null,
    device: toDevice(reply.device),
    track: toTrack(reply.item),
  }
}

export async function getDevices(token: string, fetchFn: FetchFn = fetch): Promise<Device[]> {
  const reply = await (await request(token, '/me/player/devices', fetchFn)).json()
  return (reply.devices ?? []).filter((device: any) => device?.id).map(toDevice)
}

// With a contextUri, starts that playlist; without one, resumes whatever was paused.
export async function play(
  token: string,
  { contextUri, deviceId }: { contextUri?: string; deviceId?: string },
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
  await request(token, `/me/player/play${query}`, fetchFn, {
    method: 'PUT',
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined,
  })
}

// Moves whatever is playing to another device, keeping its place and playing on.
export async function moveHere(token: string, deviceId: string, fetchFn: FetchFn = fetch): Promise<void> {
  await request(token, '/me/player', fetchFn, {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  })
}

export async function setVolume(token: string, percent: number, deviceId: string, fetchFn: FetchFn = fetch): Promise<void> {
  const query = `?volume_percent=${Math.round(percent)}&device_id=${encodeURIComponent(deviceId)}`
  await request(token, `/me/player/volume${query}`, fetchFn, { method: 'PUT' })
}
