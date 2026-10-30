export interface ModalOptions {
  // The panel's shape: round wheels by default, 'modal-page' for a paper page.
  panelClass?: string
  // Called once whenever the modal closes, however it was closed.
  onClose?: () => void
}

export function openModal(
  render: (body: HTMLElement, close: () => void) => (() => void) | void,
  { panelClass = '', onClose }: ModalOptions = {},
) {
  let cleanupContent: (() => void) | void

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-panel ${panelClass}">
      <div class="modal-body"></div>
    </div>
  `
  document.body.appendChild(overlay)

  const close = () => {
    cleanupContent?.()
    document.removeEventListener('keydown', onKeydown)
    overlay.remove()
    onClose?.()
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
