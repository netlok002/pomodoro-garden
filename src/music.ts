// The rules for music around a focus session: full volume while growing, lowered
// ("ducked") in between, picking the chosen playlist back up where it left off.
import type { Playback } from './spotifyApi.ts'

// How loud the music is between sessions, as a share of the player's own volume.
const DUCK_RATIO = 0.5

export type StartAction = 'nothing' | 'resume' | 'play-playlist'

export function focusStartAction(playback: Playback | null, playlistUri: string): StartAction {
  if (playback?.contextUri !== playlistUri) return 'play-playlist'
  return playback.isPlaying ? 'nothing' : 'resume'
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

// When focus starts: bring back the remembered volume, if there is one to restore.
export function focusStartVolume(remembered: number | null, playback: Playback | null): number | null {
  if (remembered === null || !playback?.device.supportsVolume) return null
  return remembered
}
