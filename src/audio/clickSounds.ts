import { playWoodBlock } from './sfx.ts'

// Everything the player can click that should answer with a soft wood-block tok.
const CLICKABLE = [
  '.timer-value',
  '.select-option:not(.disabled)',
  '.wheel-wedge',
  '.garden-slot.clickable',
  '.forecast-today',
  '.book-art-toggle',
  '.book-tab',
  '.radio-button',
  '.modal-close',
  '.radio-bubble-settings',
  '.paper-button',
].join(', ')

// One page-wide listener, so new buttons get the sound without extra wiring.
export function initClickSounds() {
  document.addEventListener('click', (event) => {
    if ((event.target as Element).closest(CLICKABLE)) playWoodBlock()
  })
}
