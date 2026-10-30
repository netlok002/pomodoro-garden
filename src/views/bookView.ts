import { openModal } from './modal.ts'
import { playBookClose, playBookOpen } from '../audio/sfx.ts'
import { speciesArt } from '../art/art.ts'
import { bookProgress, type Book, type BookEntry } from '../game/book.ts'
import { SPECIES, type Species } from '../game/species.ts'
import { WEATHER_LABELS } from '../weather/weather.ts'
import { escapeHtml } from '../util/html.ts'

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
        <p class="page-note">${species.durationMinutes} min seed</p>
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
      <p class="page-note">${species.durationMinutes} min seed</p>
      <p class="page-note">${countLine('normal', page.normal)} · ${countLine('perfect', page.perfect)}</p>
      ${hasPerfect ? `<p class="page-note">perfect under ${WEATHER_LABELS[species.perfectWeather]}</p>` : ''}
    </div>
  `
}

// What the Settings tab needs from the session. The book never talks to the network itself.
export interface BookSettings {
  zip: string
  weatherStatus: string
  onSaveZip: (zip: string) => Promise<string>
  onClearZip: () => string
  saveCode: string
  // Returns a message, and whether the save was loaded (the book then closes).
  onLoadSaveCode: (code: string) => { loaded: boolean; message: string }
}

function settingsHtml(settings: BookSettings): string {
  return `
    <div class="book-settings">
      <h3 class="page-heading">Weather</h3>
      <p class="page-note">Enter a US zip code to grow your garden under your real local forecast.</p>
      <form class="zip-form">
        <input class="zip-input" name="zip" inputmode="numeric" maxlength="5" placeholder="zip code"
          aria-label="US zip code" value="${escapeHtml(settings.zip)}" />
        <button type="submit" class="paper-button">Save</button>
        <button type="button" class="paper-button zip-clear">Clear</button>
      </form>
      <p class="status-line" role="status">${escapeHtml(settings.weatherStatus)}</p>

      <h3 class="page-heading">Your save</h3>
      <p class="page-note">Copy this code to back up your garden or move it to another device.</p>
      <textarea class="save-code" readonly aria-label="Your save code">${escapeHtml(settings.saveCode)}</textarea>
      <div class="save-actions">
        <button type="button" class="paper-button save-copy">Copy</button>
      </div>
      <p class="page-note">Paste a save code to load it. This replaces your current garden and book.</p>
      <textarea class="save-code save-input" aria-label="Save code to load" placeholder="GARDEN1.…"></textarea>
      <div class="save-actions">
        <button type="button" class="paper-button save-load">Load</button>
      </div>
      <p class="save-status" role="status"></p>
    </div>
  `
}

export function openBook(book: Book, settings: BookSettings) {
  playBookOpen()
  openModal((body, close) => {
    const { found, total } = bookProgress(book, SPECIES.length)
    body.innerHTML = `
      <div class="paper-page">
        <h2 class="page-title">Flower Book</h2>
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

    const status = body.querySelector<HTMLElement>('.status-line')!
    const input = body.querySelector<HTMLInputElement>('.zip-input')!
    const saveStatus = body.querySelector<HTMLElement>('.save-status')!
    const saveInput = body.querySelector<HTMLTextAreaElement>('.save-input')!
    let confirmingLoad = false

    const copySaveCode = async () => {
      const codeBox = body.querySelector<HTMLTextAreaElement>('.save-code')!
      try {
        await navigator.clipboard.writeText(settings.saveCode)
        saveStatus.textContent = 'Save code copied.'
      } catch {
        codeBox.select()
        saveStatus.textContent = 'Select the code above and copy it.'
      }
    }

    // Loading replaces everything, so the first press only asks for confirmation.
    const loadSaveCode = () => {
      if (!confirmingLoad) {
        confirmingLoad = true
        saveStatus.textContent = 'This replaces your current garden and book. Press Load again to confirm.'
        return
      }
      confirmingLoad = false
      const result = settings.onLoadSaveCode(saveInput.value)
      saveStatus.textContent = result.message
      if (result.loaded) close()
    }

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
      if (target.closest('.save-copy')) void copySaveCode()
      if (target.closest('.save-load')) loadSaveCode()
    }

    // Editing the pasted code cancels a pending confirmation.
    const onSaveInput = () => {
      confirmingLoad = false
    }

    const onSubmit = async (event: SubmitEvent) => {
      event.preventDefault()
      status.textContent = 'Looking up your zip code…'
      status.textContent = await settings.onSaveZip(input.value)
    }

    const form = body.querySelector<HTMLFormElement>('.zip-form')!
    body.addEventListener('click', onClick)
    form.addEventListener('submit', onSubmit)
    saveInput.addEventListener('input', onSaveInput)
    return () => {
      body.removeEventListener('click', onClick)
      form.removeEventListener('submit', onSubmit)
      saveInput.removeEventListener('input', onSaveInput)
    }
  }, { panelClass: 'modal-page', onClose: playBookClose })
}
