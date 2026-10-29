import { weatherArt } from './art.ts'
import { WEATHER_LABELS, type Forecast, type Weather } from './weather.ts'

// The arc lives in a 320x128 box: centre near the bottom, days placed along it.
const WIDTH = 320
const HEIGHT = 128
const ARC = { cx: 160, cy: 118, r: 104 }

const DAYS: { key: keyof Forecast; label: string; angle: number }[] = [
  { key: 'yesterday', label: 'yesterday', angle: 160 },
  { key: 'today', label: 'today', angle: 90 },
  { key: 'tomorrow', label: 'tomorrow', angle: 20 },
]

function arcPoint(angleDeg: number) {
  const angle = (Math.PI / 180) * angleDeg
  return {
    left: ((ARC.cx + ARC.r * Math.cos(angle)) / WIDTH) * 100,
    top: ((ARC.cy - ARC.r * Math.sin(angle)) / HEIGHT) * 100,
  }
}

function dayHtml(key: keyof Forecast, label: string, angle: number, weather: Weather, note: string): string {
  const { left, top } = arcPoint(angle)
  const tag = key === 'today' ? 'button' : 'div'
  return `
    <${tag} class="forecast-day forecast-${key}" style="left: ${left}%; top: ${top}%" title="${WEATHER_LABELS[weather]}">
      <span class="forecast-art">${weatherArt(weather)}</span>
      <span class="forecast-label">${label} · ${WEATHER_LABELS[weather]}${note}</span>
    </${tag}>
  `
}

export function renderForecast(container: HTMLElement, forecast: Forecast, overridden: boolean, onTodayClick: () => void) {
  const arcStart = `${ARC.cx - ARC.r} ${ARC.cy}`
  const arcEnd = `${ARC.cx + ARC.r} ${ARC.cy}`

  container.innerHTML = `
    <svg class="forecast-arc" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">
      <path d="M${arcStart} A${ARC.r} ${ARC.r} 0 0 1 ${arcEnd}" />
    </svg>
    ${DAYS.map(({ key, label, angle }) =>
      dayHtml(key, label, angle, forecast[key], key === 'today' && overridden ? ' (by hand)' : ''),
    ).join('')}
  `

  container.querySelector<HTMLButtonElement>('.forecast-today')!.addEventListener('click', onTodayClick)
}
