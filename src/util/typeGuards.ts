// True for any non-null object, so its fields can be checked one by one.
// Used when reading data we don't trust yet (saved games, pasted save codes, stored logins).
export const isObject = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null
