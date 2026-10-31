// The rules for music around a focus session: which device plays, full volume while
// growing, lowered ("ducked") in between, and the chosen playlist picked back up where it
// left off.
import type { Device, Playback } from './spotifyApi.ts'

// How loud the music is between sessions, as a share of the player's own volume.
const DUCK_RATIO = 0.5

// Which device should play. A device the player picked wins when it's available.
// Otherwise: on a phone, the phone's own Spotify (never quietly another device, which
// would surprise someone holding their phone); on a computer, a computer, then
// whatever is already playing, then anything.
export function chooseDevice(
  devices: Device[],
  playback: Playback | null,
  pickedId: string | null,
  onPhone: boolean,
): Device | null {
  const picked = devices.find((device) => device.id === pickedId)
  if (picked) return picked

  if (onPhone) return devices.find((device) => device.type === 'Smartphone') ?? null

  return (
    devices.find((device) => device.type === 'Computer') ??
    devices.find((device) => device.id === playback?.device.id) ??
    devices[0] ??
    null
  )
}

export type StartAction = 'nothing' | 'resume' | 'play-playlist' | 'move-here'

export function focusStartAction(playback: Playback | null, playlistUri: string, target: Device): StartAction {
  const ourPlaylist = playback?.contextUri === playlistUri
  if (playback && playback.device.id !== target.id) return ourPlaylist ? 'move-here' : 'play-playlist'
  if (!ourPlaylist) return 'play-playlist'
  return playback!.isPlaying ? 'nothing' : 'resume'
}

export function duckedVolume(volume: number): number {
  return Math.round(volume * DUCK_RATIO)
}

// When focus ends: remember the player's volume and lower it, if music is playing on a
// device that lets apps change the volume (many phones don't).
export function focusEndVolume(playback: Playback | null): { remember: number; set: number } | null {
  if (!playback?.isPlaying || !playback.device.supportsVolume) return null
  return { remember: playback.device.volumePercent, set: duckedVolume(playback.device.volumePercent) }
}

// When focus starts: bring back the remembered volume on the device that will play.
export function focusStartVolume(remembered: number | null, device: Device): number | null {
  if (remembered === null || !device.supportsVolume) return null
  return remembered
}
