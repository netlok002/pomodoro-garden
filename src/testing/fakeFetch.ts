// A stand-in for the browser's fetch, for tests: every request is recorded, and every
// request gets the same fixed answer.
export interface RecordedRequest {
  url: string
  method: string
  body?: string
  auth?: string
}

export function fakeFetch(status: number, body: unknown = {}) {
  const calls: RecordedRequest[] = []
  const fetchFn = async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
      auth: headers.get('Authorization') ?? undefined,
    })
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
  }
  return { fetchFn, calls }
}
