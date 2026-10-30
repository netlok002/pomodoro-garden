import { openModal } from './modal.ts'
import { weatherArt } from './art.ts'
import { WEATHERS, WEATHER_LABELS, type Weather } from './weather.ts'
import { pointOnCircle, wedgePath, WHEEL_CENTER } from './wheel.ts'

const AUTO_RADIUS = 26
const ART_RADIUS = 58
const ART_SIZE = 50
const WEDGE_DEGREES = 360 / WEATHERS.length

// Picking a weather overrides today; the plain centre circle (null) goes back to the forecast.
// The wedges are drawings only (their <title>s name them for screen readers); the centre
// is labelled "local weather" as ordinary page text so it lines up with the app's type.
export function openWeatherPicker(current: Weather | null, onSelect: (weather: Weather | null) => void) {
  openModal((body, close) => {
    const wedges = WEATHERS.map((weather, index) => {
      const startAngle = index * WEDGE_DEGREES - WEDGE_DEGREES / 2
      const middleAngle = startAngle + WEDGE_DEGREES / 2
      const art = pointOnCircle(middleAngle, ART_RADIUS)
      const isSelected = weather === current
      return `
        <path
          class="wheel-wedge${isSelected ? ' selected' : ''}"
          data-weather="${weather}"
          d="${wedgePath(startAngle, startAngle + WEDGE_DEGREES, AUTO_RADIUS)}"
        ><title>${WEATHER_LABELS[weather]}</title></path>
        <foreignObject class="wheel-art" x="${art.x - ART_SIZE / 2}" y="${art.y - ART_SIZE / 2}" width="${ART_SIZE}" height="${ART_SIZE}">${weatherArt(weather)}</foreignObject>
      `
    }).join('')

    body.innerHTML = `
      <svg class="wheel" viewBox="0 0 200 200">
        ${wedges}
        <circle class="wheel-wedge${current === null ? ' selected' : ''}" data-weather="auto" cx="${WHEEL_CENTER}" cy="${WHEEL_CENTER}" r="${AUTO_RADIUS}"><title>Use the local forecast</title></circle>
        <foreignObject class="weather-center-label" x="${WHEEL_CENTER - AUTO_RADIUS}" y="${WHEEL_CENTER - AUTO_RADIUS}" width="${AUTO_RADIUS * 2}" height="${AUTO_RADIUS * 2}">
          <div class="weather-center-text">local weather</div>
        </foreignObject>
      </svg>
    `

    const onClick = (event: MouseEvent) => {
      const target = (event.target as SVGElement).closest<SVGElement>('[data-weather]')
      if (!target) return
      const choice = target.dataset.weather!
      onSelect(choice === 'auto' ? null : (choice as Weather))
      close()
    }

    body.addEventListener('click', onClick)
    return () => body.removeEventListener('click', onClick)
  })
}
