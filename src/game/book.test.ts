import { describe, it, expect } from 'vitest'
import { bookProgress, recordPick, type Book } from './book.ts'

describe('recordPick', () => {
  it('adds a first find with a count of 1 and the date found', () => {
    expect(recordPick({}, 'glowcap', 'normal', '2026-10-29')).toEqual({
      glowcap: { normal: { count: 1, firstFound: '2026-10-29' } },
    })
  })

  it('counts duplicates but keeps the original find date', () => {
    const book: Book = { glowcap: { normal: { count: 1, firstFound: '2026-10-29' } } }
    expect(recordPick(book, 'glowcap', 'normal', '2026-11-02').glowcap.normal).toEqual({
      count: 2,
      firstFound: '2026-10-29',
    })
  })

  it('keeps normal and perfect entries separate', () => {
    const book: Book = { glowcap: { normal: { count: 3, firstFound: '2026-10-29' } } }
    const updated = recordPick(book, 'glowcap', 'perfect', '2026-11-01')
    expect(updated.glowcap.normal?.count).toBe(3)
    expect(updated.glowcap.perfect).toEqual({ count: 1, firstFound: '2026-11-01' })
  })

  it('does not change the original book', () => {
    const book: Book = {}
    recordPick(book, 'glowcap', 'normal', '2026-10-29')
    expect(book).toEqual({})
  })
})

describe('bookProgress', () => {
  it('counts found entries out of a normal and perfect entry per species', () => {
    const book: Book = {
      glowcap: { normal: { count: 4, firstFound: '2026-10-29' }, perfect: { count: 1, firstFound: '2026-10-30' } },
      murkmoss: { normal: { count: 1, firstFound: '2026-10-29' } },
    }
    expect(bookProgress(book, 8)).toEqual({ found: 3, total: 16 })
  })

  it('starts at zero', () => {
    expect(bookProgress({}, 8)).toEqual({ found: 0, total: 16 })
  })
})
