import { openModal } from './modal.ts'
import { playBookClose, playBookOpen } from './sfx.ts'
import { speciesArt } from './art.ts'
import { bookProgress, type Book, type BookEntry } from './book.ts'
import { SPECIES, type Species } from './species.ts'
import { WEATHER_LABELS } from './weather.ts'

function countLine(label: string, entry: BookEntry | undefined): string {
  return entry ? `${label} ×${entry.count}` : `${label} —`
}

function cardHtml(species: Species, book: Book): string {
  const page = book[species.id] ?? {}
  if (!page.normal && !page.perfect) {
    return `
      <div class="book-card undiscovered">
        <div class="book-art">${speciesArt(species.id)}</div>
        <p class="book-name">???</p>
        <p class="book-detail">${species.durationMinutes} min seed</p>
      </div>
    `
  }

  // Once a perfect is found, the drawing toggles between normal and glowing,
  // and the card reveals which weather the species loves.
  const hasPerfect = Boolean(page.perfect)
  const art = hasPerfect
    ? `<button class="book-art book-art-toggle perfect" title="Show normal / perfect">${speciesArt(species.id)}</button>`
    : `<div class="book-art">${speciesArt(species.id)}</div>`

  return `
    <div class="book-card">
      ${art}
      <p class="book-name">${species.name}</p>
      <p class="book-detail">${species.durationMinutes} min seed</p>
      <p class="book-detail">${countLine('normal', page.normal)} · ${countLine('perfect', page.perfect)}</p>
      ${hasPerfect ? `<p class="book-detail">perfect under ${WEATHER_LABELS[species.perfectWeather]}</p>` : ''}
    </div>
  `
}

export function openBook(book: Book) {
  playBookOpen()
  openModal((body) => {
    const { found, total } = bookProgress(book, SPECIES.length)
    body.innerHTML = `
      <div class="book">
        <h2 class="book-title">Flower Book</h2>
        <p class="book-progress">${found} of ${total} found</p>
        <div class="book-grid">
          ${SPECIES.map((species) => cardHtml(species, book)).join('')}
        </div>
      </div>
    `

    const onClick = (event: MouseEvent) => {
      const toggle = (event.target as HTMLElement).closest('.book-art-toggle')
      toggle?.classList.toggle('perfect')
    }
    body.addEventListener('click', onClick)
    return () => body.removeEventListener('click', onClick)
  }, { panelClass: 'modal-page', onClose: playBookClose })
}
