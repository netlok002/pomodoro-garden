export function openModal(render: (body: HTMLElement, close: () => void) => (() => void) | void) {
  let cleanupContent: (() => void) | void

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-panel">
      <div class="modal-body"></div>
    </div>
  `
  document.body.appendChild(overlay)

  const close = () => {
    cleanupContent?.()
    document.removeEventListener('keydown', onKeydown)
    overlay.remove()
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close()
  })
  document.addEventListener('keydown', onKeydown)

  const body = overlay.querySelector<HTMLElement>('.modal-body')!
  cleanupContent = render(body, close)
}
