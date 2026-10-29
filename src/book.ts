export type Variant = 'normal' | 'perfect'

export interface BookEntry {
  count: number
  firstFound: string
}

// Keyed by species id, then by variant. Missing entries are flowers not found yet.
export type Book = Record<string, Partial<Record<Variant, BookEntry>>>

export function recordPick(book: Book, speciesId: string, variant: Variant, date: string): Book {
  const page = book[speciesId] ?? {}
  const existing = page[variant]
  const entry: BookEntry = existing
    ? { count: existing.count + 1, firstFound: existing.firstFound }
    : { count: 1, firstFound: date }
  return { ...book, [speciesId]: { ...page, [variant]: entry } }
}
