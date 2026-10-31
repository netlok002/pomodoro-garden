import { describe, it, expect } from 'vitest'
import { chooseDevice, duckedVolume, focusEndVolume, focusStartAction, focusStartVolume } from './music.ts'
import type { Device, Playback } from './spotifyApi.ts'

const PLAYLIST = 'spotify:playlist:focus'
const desktop: Device = { id: 'desk', name: 'Desktop', type: 'Computer', volumePercent: 80, supportsVolume: true }
const phone: Device = { id: 'phone', name: 'iPhone', type: 'Smartphone', volumePercent: 60, supportsVolume: false }
const speaker: Device = { id: 'spk', name: 'Kitchen', type: 'Speaker', volumePercent: 40, supportsVolume: true }

const playing = (contextUri: string | null, isPlaying = true, device = desktop): Playback => ({
  isPlaying,
  contextUri,
  device,
  track: null,
})

describe('chooseDevice', () => {
  it('uses the device the player picked, when it is available', () => {
    expect(chooseDevice([desktop, phone, speaker], playing(PLAYLIST), 'spk', false)).toEqual(speaker)
  })

  it('on a phone, plays on a phone rather than the desktop that is already playing', () => {
    expect(chooseDevice([desktop, phone], playing(PLAYLIST), null, true)).toEqual(phone)
  })

  it("on a phone, doesn't fall back to another device when the phone's Spotify is asleep", () => {
    expect(chooseDevice([desktop], playing(PLAYLIST), null, true)).toBeNull()
  })

  it('on a computer, prefers a computer, then whatever is playing, then anything', () => {
    expect(chooseDevice([phone, desktop], playing(PLAYLIST, true, phone), null, false)).toEqual(desktop)
    expect(chooseDevice([phone, speaker], playing(PLAYLIST, true, speaker), null, false)).toEqual(speaker)
    expect(chooseDevice([speaker], null, null, false)).toEqual(speaker)
    expect(chooseDevice([], null, null, false)).toBeNull()
  })

  it('falls back to the automatic choice when the picked device is gone', () => {
    expect(chooseDevice([desktop], null, 'spk', false)).toEqual(desktop)
  })
})

describe('focusStartAction', () => {
  it('starts the playlist when nothing is playing anywhere', () => {
    expect(focusStartAction(null, PLAYLIST, desktop)).toBe('play-playlist')
  })

  it('leaves the playlist alone when it is already playing on the chosen device', () => {
    expect(focusStartAction(playing(PLAYLIST), PLAYLIST, desktop)).toBe('nothing')
  })

  it('resumes the playlist where it paused', () => {
    expect(focusStartAction(playing(PLAYLIST, false), PLAYLIST, desktop)).toBe('resume')
  })

  it('switches to the playlist when something else is on', () => {
    expect(focusStartAction(playing('spotify:album:other'), PLAYLIST, desktop)).toBe('play-playlist')
    expect(focusStartAction(playing(null, false), PLAYLIST, desktop)).toBe('play-playlist')
  })

  it('moves the playlist to the chosen device, keeping its place, when it plays elsewhere', () => {
    expect(focusStartAction(playing(PLAYLIST, true, desktop), PLAYLIST, phone)).toBe('move-here')
  })

  it('starts the playlist on the chosen device when something else plays elsewhere', () => {
    expect(focusStartAction(playing('spotify:album:other', true, desktop), PLAYLIST, phone)).toBe('play-playlist')
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
    expect(focusEndVolume(playing(PLAYLIST, true, phone))).toBeNull()
    expect(focusEndVolume(null)).toBeNull()
  })
})

describe('focusStartVolume', () => {
  it('brings back the remembered volume on the device that will play', () => {
    expect(focusStartVolume(80, desktop)).toBe(80)
  })

  it('does nothing when there is no remembered volume or the device cannot change volume', () => {
    expect(focusStartVolume(null, desktop)).toBeNull()
    expect(focusStartVolume(80, phone)).toBeNull()
  })
})
