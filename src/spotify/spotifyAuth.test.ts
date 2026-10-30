import { describe, it, expect } from 'vitest'
import { fakeFetch } from '../testing/fakeFetch.ts'
import {
  SPOTIFY_SCOPES,
  authorizeUrl,
  codeChallenge,
  exchangeCode,
  isExpired,
  makeCodeVerifier,
  readCallback,
  refreshTokens,
  type SpotifyTokens,
} from './spotifyAuth.ts'

const NOW = 1_000_000


describe('makeCodeVerifier', () => {
  it('makes a long random string using only URL-safe characters', () => {
    const verifier = makeCodeVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
    expect(makeCodeVerifier()).not.toBe(verifier)
  })
})

describe('codeChallenge', () => {
  it('matches the PKCE example from the OAuth spec (RFC 7636)', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })
})

describe('authorizeUrl', () => {
  it('asks Spotify for the scopes we need, with the PKCE challenge', () => {
    const url = new URL(authorizeUrl('client123', 'https://example.test/app/', 'challenge456', 'state789'))
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('client_id')).toBe('client123')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.test/app/')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('challenge456')
    expect(url.searchParams.get('state')).toBe('state789')
    expect(url.searchParams.get('scope')).toBe(SPOTIFY_SCOPES.join(' '))
  })
})

describe('readCallback', () => {
  it('reads the code and state Spotify sends back', () => {
    expect(readCallback('https://example.test/app/?code=abc&state=xyz')).toEqual({ code: 'abc', state: 'xyz' })
  })

  it('reports when the player said no', () => {
    expect(readCallback('https://example.test/app/?error=access_denied&state=xyz')).toEqual({ error: 'access_denied' })
  })

  it('gives null for a normal page load', () => {
    expect(readCallback('https://example.test/app/')).toBeNull()
  })
})

describe('isExpired', () => {
  const tokens: SpotifyTokens = { accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 120_000 }

  it('treats a token as expired a minute early, to be safe', () => {
    expect(isExpired(tokens, NOW)).toBe(false)
    expect(isExpired(tokens, NOW + 61_000)).toBe(true)
  })
})

describe('exchangeCode', () => {
  it('trades the code and verifier for tokens', async () => {
    const { fetchFn, calls } = fakeFetch(200, { access_token: 'acc', refresh_token: 'ref', expires_in: 3600 })
    const tokens = await exchangeCode('client123', 'https://example.test/app/', 'code1', 'verifier1', NOW, fetchFn)
    expect(tokens).toEqual({ accessToken: 'acc', refreshToken: 'ref', expiresAt: NOW + 3_600_000 })
    expect(calls[0].url).toBe('https://accounts.spotify.com/api/token')
    const body = new URLSearchParams(String(calls[0].body))
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('code1')
    expect(body.get('code_verifier')).toBe('verifier1')
    expect(body.get('client_id')).toBe('client123')
  })

  it('fails clearly when Spotify refuses', async () => {
    const { fetchFn } = fakeFetch(400, { error: 'invalid_grant' })
    await expect(exchangeCode('c', 'r', 'code', 'v', NOW, fetchFn)).rejects.toThrow()
  })
})

describe('refreshTokens', () => {
  const tokens: SpotifyTokens = { accessToken: 'old', refreshToken: 'ref1', expiresAt: NOW }

  it('gets a fresh access token, keeping the old refresh token if no new one comes back', async () => {
    const { fetchFn, calls } = fakeFetch(200, { access_token: 'new', expires_in: 3600 })
    expect(await refreshTokens('client123', tokens, NOW, fetchFn)).toEqual({
      accessToken: 'new',
      refreshToken: 'ref1',
      expiresAt: NOW + 3_600_000,
    })
    expect(new URLSearchParams(String(calls[0].body)).get('grant_type')).toBe('refresh_token')
  })

  it('uses a new refresh token when Spotify rotates it', async () => {
    const { fetchFn } = fakeFetch(200, { access_token: 'new', refresh_token: 'ref2', expires_in: 3600 })
    expect((await refreshTokens('client123', tokens, NOW, fetchFn)).refreshToken).toBe('ref2')
  })
})
