// Spotify login for a browser-only app, using the Authorization Code flow with PKCE:
// no client secret, so nothing private ever ships in the code.
//
// 1. Make a random "code verifier" and keep it; send Spotify only its SHA-256 "challenge".
// 2. Spotify sends the player back with a one-time code.
// 3. Trade the code plus the original verifier for tokens; only we know the verifier.

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
]

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

const VERIFIER_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const EXPIRY_MARGIN_MS = 60_000

export function makeCodeVerifier(length = 64): string {
  const random = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(random, (byte) => VERIFIER_CHARACTERS[byte % VERIFIER_CHARACTERS.length]).join('')
}

// Base64 without the characters that need escaping in URLs.
function base64Url(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(digest)
}

export function authorizeUrl(clientId: string, redirectUri: string, challenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export type Callback = { code: string; state: string } | { error: string }

// Spotify returns to our page with ?code=…&state=… (or ?error=…).
export function readCallback(url: string): Callback | null {
  const params = new URL(url).searchParams
  const error = params.get('error')
  if (error) return { error }
  const code = params.get('code')
  const state = params.get('state')
  return code && state ? { code, state } : null
}

export function isExpired(tokens: SpotifyTokens, now: number): boolean {
  return now >= tokens.expiresAt - EXPIRY_MARGIN_MS
}

async function requestTokens(body: Record<string, string>, fetchFn: FetchFn) {
  const response = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!response.ok) throw new Error(`Spotify token request failed (${response.status})`)
  return response.json()
}

export async function exchangeCode(
  clientId: string,
  redirectUri: string,
  code: string,
  verifier: string,
  now: number,
  fetchFn: FetchFn = fetch,
): Promise<SpotifyTokens> {
  const reply = await requestTokens(
    { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier },
    fetchFn,
  )
  return { accessToken: reply.access_token, refreshToken: reply.refresh_token, expiresAt: now + reply.expires_in * 1000 }
}

export async function refreshTokens(
  clientId: string,
  tokens: SpotifyTokens,
  now: number,
  fetchFn: FetchFn = fetch,
): Promise<SpotifyTokens> {
  const reply = await requestTokens(
    { grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: clientId },
    fetchFn,
  )
  return {
    accessToken: reply.access_token,
    refreshToken: reply.refresh_token ?? tokens.refreshToken,
    expiresAt: now + reply.expires_in * 1000,
  }
}
