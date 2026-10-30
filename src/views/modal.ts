export interface ModalOptions {
  // The panel's shape: round wheels by default, 'modal-page' for a paper page.
  panelClass?: string
  // Called once whenever the modal closes, however it was closed.
  onClose?: () => void
  // A visible × button: needed on phones, where a full-screen page leaves nowhere to tap outside.
  closeButton?: boolean
}

export function openModal(
  render: (body: HTMLElement, close: () => void) => (() => void) | void,
  { panelClass = '', onClose, closeButton = false }: ModalOptions = {},
) {
  let cleanupContent: (() => void) | void

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-panel ${panelClass}">
      ${closeButton ? '<button type="button" class="modal-close" aria-label="Close">×</button>' : ''}
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
  overlay.querySelector('.modal-close')?.addEventListener('click', close)

  const body = overlay.querySelector<HTMLElement>('.modal-body')!
  cleanupContent = render(body, close)
}
