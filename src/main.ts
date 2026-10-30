import './styles/index.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './util/devSpeed.ts'
import { initClickSounds } from './audio/clickSounds.ts'
import { createSpotify } from './spotify/spotify.ts'
import { openRadio } from './views/radioView.ts'
import { SKETCH_FILTERS, bookArt, flowerboxArt, noteArt, radioArt } from './art/art.ts'

// Speed-up shortcuts (Ctrl+Shift+1–4) only exist when running locally, not on the live site.
if (import.meta.env.DEV) initDevSpeed()
initClickSounds()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${SKETCH_FILTERS}
  <main>
    <button id="book-button" class="book-button" title="Flower Book" aria-label="Flower Book">${bookArt()}</button>
    <div id="forecast" class="forecast"></div>
    <div id="plant"></div>
    <div id="timer-display"></div>
    <div id="controls"></div>
    <div class="garden-wrap">
      <div id="garden" class="garden"></div>
      <div class="flowerbox">${flowerboxArt()}</div>
      <button id="radio-button" class="radio-button" aria-label="Radio" aria-describedby="radio-bubble">${radioArt()}</button>
      <div id="radio-bubble" class="radio-bubble" role="status" hidden>
        <span class="radio-bubble-heading">Now playing</span>
        <span class="radio-bubble-text"></span>
        <button type="button" class="radio-bubble-settings">Radio settings ›</button>
      </div>
      <div id="music-notes" class="music-notes" aria-hidden="true" hidden>
        <span class="music-note note-1">${noteArt('single')}</span>
        <span class="music-note note-2">${noteArt('pair')}</span>
        <span class="music-note note-3">${noteArt('single')}</span>
      </div>
    </div>
    <p id="note" class="note"></p>
  </main>
`

const element = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!

const spotify = createSpotify()

initSession(
  {
    forecast: element('forecast'),
    plant: element('plant'),
    display: element('timer-display'),
    controls: element('controls'),
    garden: element('garden'),
    note: element('note'),
    bookButton: element('book-button'),
  },
  {
    onFocusStart: () => void spotify.focusStart().then(checkPlayingSoon),
    onFocusEnd: () => void spotify.focusEnd().then(checkPlayingSoon),
  },
)

// The radio works by tap, so it behaves the same on phones and computers:
// the first tap shows what's playing; a second tap (or "Radio settings") opens the radio.
// Song names come from Spotify, so they're only ever set as text.
const radio = element('radio-button')
const bubble = element('radio-bubble')
const bubbleText = bubble.querySelector<HTMLElement>('.radio-bubble-text')!

const showNowPlaying = async () => {
  bubbleText.textContent = 'Tuning in…'
  bubble.hidden = false
  const text = await spotify.nowPlaying()
  if (!bubble.hidden) bubbleText.textContent = text
}
const hideNowPlaying = () => {
  bubble.hidden = true
}
const openRadioSettings = () => {
  hideNowPlaying()
  openRadio(spotify)
}

radio.addEventListener('click', () => (bubble.hidden ? void showNowPlaying() : openRadioSettings()))
bubble.querySelector('.radio-bubble-settings')!.addEventListener('click', openRadioSettings)
// Tapping anywhere else, or Escape, closes the bubble.
document.addEventListener('click', (event) => {
  const target = event.target as Element
  if (!radio.contains(target) && !bubble.contains(target)) hideNowPlaying()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideNowPlaying()
})

// Coming back from Spotify's login page: finish connecting, then show the radio to pick a playlist.
void spotify.finishLogin().then((returnedFromSpotify) => {
  if (returnedFromSpotify) openRadio(spotify)
})

// Music notes float above the radio while Spotify is playing. Spotify can't tell us when
// playback changes, so we ask: every 15 seconds while the tab is visible, when the
// player comes back to the tab, and shortly after each session starts or ends.
const notes = element('music-notes')
spotify.onPlayingChange((playing) => (notes.hidden = !playing))

const PLAYING_CHECK_MS = 15_000
const checkPlaying = () => {
  if (document.visibilityState === 'visible') void spotify.checkPlaying()
}
function checkPlayingSoon() {
  setTimeout(checkPlaying, 2_000)
}
setInterval(checkPlaying, PLAYING_CHECK_MS)
document.addEventListener('visibilitychange', checkPlaying)
checkPlaying()

// Offline support for the installed app (published site only; it would get in the way
// of the dev server's live reloading).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}
