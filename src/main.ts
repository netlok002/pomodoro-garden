import './style.css'
import { initSession } from './session.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <div id="creature"></div>
    <div id="timer-display">25:00</div>
    <div id="controls"></div>
  </main>
`

initSession(
  document.querySelector<HTMLDivElement>('#timer-display')!,
  document.querySelector<HTMLDivElement>('#controls')!,
  document.querySelector<HTMLDivElement>('#creature')!,
)
