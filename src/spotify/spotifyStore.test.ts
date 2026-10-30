import { describe, it, expect } from 'vitest'
import { parseSpotifyState } from './spotifyStore.ts'

const EMPTY = { tokens: null, playlist: null, rememberedVolume: null }
const tokens = { accessToken: 'acc', refreshToken: 'ref', expiresAt: 123 }
const playlist = { uri: 'spotify:playlist:37i9dQZF1DX8NTLI2TtZa6', name: 'Deep Focus' }

describe('parseSpotifyState', () => {
  it('starts empty when nothing is saved or the save is broken', () => {
    expect(parseSpotifyState(null)).toEqual(EMPTY)
    expect(parseSpotifyState('{oops')).toEqual(EMPTY)
  })

  it('restores the login, chosen playlist and remembered volume', () => {
    const saved = { tokens, playlist, rememberedVolume: 70 }
    expect(parseSpotifyState(JSON.stringify(saved))).toEqual(saved)
  })

  it('drops anything malformed', () => {
    const saved = {
      tokens: { accessToken: 'acc', refreshToken: 5, expiresAt: 'soon' },
      playlist: { uri: 'javascript:alert(1)', name: 'Bad' },
      rememberedVolume: 400,
    }
    expect(parseSpotifyState(JSON.stringify(saved))).toEqual(EMPTY)
  })
})
