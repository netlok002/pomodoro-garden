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

const VARIANTS: Variant[] = ['normal', 'perfect']

export function bookProgress(book: Book, speciesCount: number): { found: number; total: number } {
  const found = Object.values(book).reduce(
    (sum, page) => sum + VARIANTS.filter((variant) => page[variant]).length,
    0,
  )
  return { found, total: speciesCount * VARIANTS.length }
}
