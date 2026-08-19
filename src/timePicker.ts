import { formatTime } from './timer.ts'
import { renderSelectableList } from './select.ts'
import { openModal } from './modal.ts'

const MIN_MINUTES = 5
const MAX_MINUTES = 60
const STEP_MINUTES = 5

export function openTimePicker(currentSeconds: number, onSelect: (seconds: number) => void) {
  const minuteOptions: number[] = []
  for (let minutes = MIN_MINUTES; minutes <= MAX_MINUTES; minutes += STEP_MINUTES) {
    minuteOptions.push(minutes)
  }

  const options = minuteOptions.map((minutes) => ({
    value: String(minutes * 60),
    label: formatTime(minutes * 60),
  }))

  const currentIndex = minuteOptions.indexOf(Math.round(currentSeconds / 60))
  const initialIndex = currentIndex === -1 ? 0 : currentIndex

  openModal((body, close) =>
    renderSelectableList(
      body,
      options,
      (value) => {
        onSelect(Number(value))
        close()
      },
      initialIndex,
    ),
  )
}
