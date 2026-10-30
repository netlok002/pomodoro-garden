import { parseState, type StoredState } from './storage.ts'

// "GARDEN1." marks a version-1 save code, so the format can change later without
// breaking codes people already copied.
const PREFIX = 'GARDEN1.'

// Base64 only handles plain bytes, so text goes through UTF-8 first (place names can
// have accents, like Española).
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeSave(state: StoredState): string {
  return PREFIX + toBase64(JSON.stringify(state))
}

// Returns null for anything that isn't a usable save. A loaded save is cleaned by
// parseState exactly like a normal load, so a hand-made code can't smuggle in bad data.
export function decodeSave(code: string, now: number): StoredState | null {
  const compact = code.replace(/\s+/g, '')
  if (!compact.startsWith(PREFIX)) return null
  try {
    const json = fromBase64(compact.slice(PREFIX.length))
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed?.garden)) return null
    return parseState(json, now)
  } catch {
    return null
  }
}
