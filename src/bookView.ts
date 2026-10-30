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

// What the Settings tab needs from the session. The book never talks to the network itself.
export interface BookSettings {
  zip: string
  weatherStatus: string
  onSaveZip: (zip: string) => Promise<string>
  onClearZip: () => string
}

function settingsHtml(settings: BookSettings): string {
  return `
    <div class="book-settings">
      <h3 class="book-settings-heading">Weather</h3>
      <p class="book-detail">Enter a US zip code to grow your garden under your real local forecast.</p>
      <form class="zip-form">
        <input class="zip-input" name="zip" inputmode="numeric" maxlength="5" placeholder="zip code"
          aria-label="US zip code" value="${settings.zip}" />
        <button type="submit" class="book-action">Save</button>
        <button type="button" class="book-action zip-clear">Clear</button>
      </form>
      <p class="zip-status" role="status">${settings.weatherStatus}</p>
    </div>
  `
}

export function openBook(book: Book, settings: BookSettings) {
  playBookOpen()
  openModal((body) => {
    const { found, total } = bookProgress(book, SPECIES.length)
    body.innerHTML = `
      <div class="book">
        <h2 class="book-title">Flower Book</h2>
        <div class="book-tabs" role="tablist">
          <button class="book-tab active" data-tab="flowers" role="tab">Flowers</button>
          <button class="book-tab" data-tab="settings" role="tab">Settings</button>
        </div>
        <div class="book-panel" data-panel="flowers">
          <p class="book-progress">${found} of ${total} found</p>
          <div class="book-grid">
            ${SPECIES.map((species) => cardHtml(species, book)).join('')}
          </div>
        </div>
        <div class="book-panel" data-panel="settings" hidden>${settingsHtml(settings)}</div>
      </div>
    `

    const status = body.querySelector<HTMLElement>('.zip-status')!
    const input = body.querySelector<HTMLInputElement>('.zip-input')!

    const showTab = (tab: string) => {
      body.querySelectorAll<HTMLElement>('.book-tab').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tab)
      })
      body.querySelectorAll<HTMLElement>('.book-panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab
      })
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const tab = target.closest<HTMLElement>('.book-tab')
      if (tab) showTab(tab.dataset.tab!)
      target.closest('.book-art-toggle')?.classList.toggle('perfect')
      if (target.closest('.zip-clear')) {
        input.value = ''
        status.textContent = settings.onClearZip()
      }
    }

    const onSubmit = async (event: SubmitEvent) => {
      event.preventDefault()
      status.textContent = 'Looking up your zip code…'
      status.textContent = await settings.onSaveZip(input.value)
    }

    const form = body.querySelector<HTMLFormElement>('.zip-form')!
    body.addEventListener('click', onClick)
    form.addEventListener('submit', onSubmit)
    return () => {
      body.removeEventListener('click', onClick)
      form.removeEventListener('submit', onSubmit)
    }
  }, { panelClass: 'modal-page', onClose: playBookClose })
}
