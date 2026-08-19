export interface SelectOption {
  value: string
  label: string
}

export function renderSelectableList(
  container: HTMLElement,
  options: SelectOption[],
  onConfirm: (value: string) => void,
  initialIndex = 0,
): () => void {
  let selectedIndex = initialIndex

  const render = () => {
    container.innerHTML = options
      .map((option, index) => {
        const isSelected = index === selectedIndex
        const marker = isSelected ? '❯' : ' '
        return `<div class="select-option${isSelected ? ' selected' : ''}" data-index="${index}">${marker} ${option.label}</div>`
      })
      .join('')
  }

  const confirm = () => {
    cleanup()
    onConfirm(options[selectedIndex].value)
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % options.length
      render()
    } else if (event.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + options.length) % options.length
      render()
    } else if (event.key === 'Enter') {
      confirm()
    }
  }

  const onClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('.select-option')
    if (!target) return
    selectedIndex = Number(target.dataset.index)
    confirm()
  }

  const cleanup = () => {
    document.removeEventListener('keydown', onKeydown)
    container.removeEventListener('click', onClick)
  }

  document.addEventListener('keydown', onKeydown)
  container.addEventListener('click', onClick)
  render()

  return cleanup
}
