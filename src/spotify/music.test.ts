import { describe, it, expect } from 'vitest'
import { duckedVolume, focusEndVolume, focusStartAction, focusStartVolume } from './music.ts'
import type { Playback } from './spotifyApi.ts'

const PLAYLIST = 'spotify:playlist:focus'
const device = { id: 'd1', volumePercent: 80, supportsVolume: true }
const playing = (contextUri: string | null, isPlaying = true): Playback => ({ isPlaying, contextUri, device, track: null })

describe('focusStartAction', () => {
  it('starts the playlist when nothing is playing anywhere', () => {
    expect(focusStartAction(null, PLAYLIST)).toBe('play-playlist')
  })

  it('leaves the playlist alone when it is already playing', () => {
    expect(focusStartAction(playing(PLAYLIST), PLAYLIST)).toBe('nothing')
  })

  it('resumes the playlist where it paused', () => {
    expect(focusStartAction(playing(PLAYLIST, false), PLAYLIST)).toBe('resume')
  })

  it('switches to the playlist when something else is on', () => {
    expect(focusStartAction(playing('spotify:album:other'), PLAYLIST)).toBe('play-playlist')
    expect(focusStartAction(playing(null, false), PLAYLIST)).toBe('play-playlist')
  })
})

describe('duckedVolume', () => {
  it('halves the volume between sessions', () => {
    expect(duckedVolume(80)).toBe(40)
    expect(duckedVolume(35)).toBe(18)
  })
})

describe('focusEndVolume', () => {
  it('remembers the volume and lowers it while music plays', () => {
    expect(focusEndVolume(playing(PLAYLIST))).toEqual({ remember: 80, set: 40 })
  })

  it('does nothing when music is paused or the device cannot change volume', () => {
    expect(focusEndVolume(playing(PLAYLIST, false))).toBeNull()
    expect(focusEndVolume({ ...playing(PLAYLIST), device: { ...device, supportsVolume: false } })).toBeNull()
    expect(focusEndVolume(null)).toBeNull()
  })
})

describe('focusStartVolume', () => {
  it('brings back the remembered volume', () => {
    expect(focusStartVolume(80, playing(PLAYLIST))).toBe(80)
  })

  it('does nothing when there is no remembered volume or the device cannot change volume', () => {
    expect(focusStartVolume(null, playing(PLAYLIST))).toBeNull()
    expect(focusStartVolume(80, { ...playing(PLAYLIST), device: { ...device, supportsVolume: false } })).toBeNull()
  })
})
