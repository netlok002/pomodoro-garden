import { startTimer, formatTime } from './timer.ts'
import { isFull, placePlant, removePlant, type Garden } from './garden.ts'
import { recordPick, type Book } from './book.ts'
import { localDateKey } from './dates.ts'
import { SPECIES, getSpecies } from './species.ts'
import {
  addWeatherTime,
  currentWeather,
  forecast,
  isPerfect,
  type WeatherOverride,
  type WeatherTally,
} from './weather.ts'
import { loadState, saveState } from './storage.ts'
import { playDoneSound, playStartSound } from './sound.ts'
import { openSeedPicker } from './seedPicker.ts'
import { openWeatherPicker } from './weatherPicker.ts'
import { renderGarden } from './gardenView.ts'
import { renderForecast } from './forecastView.ts'
import { renderGrowingPlant, renderSeedChoice } from './plantView.ts'

// What is growing right now. slotIndex is set when resuming a sprout already in the garden.
interface Planting {
  speciesId: string
  startElapsedSeconds: number
  weatherSeconds: WeatherTally
  slotIndex?: number
}

export interface SessionElements {
  forecast: HTMLElement
  plant: HTMLElement
  display: HTMLElement
  controls: HTMLElement
  garden: HTMLElement
  note: HTMLElement
}

export function initSession(elements: SessionElements) {
  const saved = loadState()
  let garden: Garden = saved.garden
  let book: Book = saved.book
  let weatherOverride: WeatherOverride | null = saved.weatherOverride
  let selectedSpeciesId = SPECIES[0].id

  const save = () => saveState({ garden, book, weatherOverride, lastSeen: Date.now() })

  const updateGarden = (next: Garden) => {
    garden = next
    save()
  }

  const todayKey = () => localDateKey(new Date())
  const weatherNow = () => currentWeather(todayKey(), weatherOverride)

  const renderWeather = () => {
    const overriddenToday = weatherOverride?.date === todayKey()
    renderForecast(elements.forecast, forecast(new Date(), weatherOverride), overriddenToday, () => {
      openWeatherPicker(overriddenToday ? weatherOverride!.weather : null, (choice) => {
        weatherOverride = choice ? { date: todayKey(), weather: choice } : null
        save()
        renderWeather()
      })
    })
  }

  const pickFlower = (slotIndex: number) => {
    const flower = garden[slotIndex]
    if (flower.kind !== 'flower') return
    book = recordPick(book, flower.speciesId, flower.perfect ? 'perfect' : 'normal', todayKey())
    updateGarden(removePlant(garden, slotIndex))
    const name = getSpecies(flower.speciesId).name
    goIdle(`Pressed a ${flower.perfect ? 'perfect ' : ''}${name} into your book.`)
  }

  const goIdle = (note = '') => {
    const species = getSpecies(selectedSpeciesId)
    renderWeather()
    renderSeedChoice(elements.plant, species)
    renderGarden(elements.garden, garden, {
      onSproutClick: (slotIndex) => {
        const sprout = garden[slotIndex]
        if (sprout.kind !== 'sprout') return
        goRunning({
          speciesId: sprout.speciesId,
          startElapsedSeconds: sprout.elapsedSeconds,
          weatherSeconds: sprout.weatherSeconds,
          slotIndex,
        })
      },
      onFlowerClick: pickFlower,
    })
    elements.note.textContent = note

    elements.display.innerHTML = `<span id="timer-value" class="timer-value">${formatTime(species.durationMinutes * 60)}</span>`
    elements.display.querySelector<HTMLSpanElement>('#timer-value')!.addEventListener('click', () => {
      openSeedPicker(selectedSpeciesId, (speciesId) => {
        selectedSpeciesId = speciesId
        goIdle()
      })
    })

    if (isFull(garden)) {
      elements.controls.innerHTML = '<div class="select-option disabled">Your garden is full — click a flower to pick it</div>'
      return
    }
    elements.controls.innerHTML = '<div id="start-button" class="select-option selected">❯ Plant</div>'
    elements.controls.querySelector<HTMLDivElement>('#start-button')!.addEventListener('click', () => {
      goRunning({ speciesId: selectedSpeciesId, startElapsedSeconds: 0, weatherSeconds: {} })
    })
  }

  const goRunning = (planting: Planting) => {
    const species = getSpecies(planting.speciesId)
    const remainingSeconds = species.durationMinutes * 60 - planting.startElapsedSeconds

    // Each tick credits the seconds since the last tick to whatever the weather is right now.
    let weatherSeconds = planting.weatherSeconds
    let countedSeconds = 0
    const countWeatherUpTo = (elapsedSeconds: number) => {
      const newSeconds = elapsedSeconds - countedSeconds
      if (newSeconds <= 0) return
      weatherSeconds = addWeatherTime(weatherSeconds, weatherNow(), newSeconds)
      countedSeconds = elapsedSeconds
    }

    playStartSound()
    renderWeather()
    elements.note.textContent = ''
    renderGarden(elements.garden, garden)
    renderGrowingPlant(elements.plant, species, planting.startElapsedSeconds)
    elements.controls.innerHTML = `
      <div class="select-option disabled">&nbsp; Growing...</div>
      <div id="cancel-button" class="select-option">❯ Stop</div>
    `

    const onTick = (elapsedSeconds: number) => {
      countWeatherUpTo(elapsedSeconds)
      renderGrowingPlant(elements.plant, species, planting.startElapsedSeconds + elapsedSeconds)
    }

    const onDone = () => {
      playDoneSound()
      const perfect = isPerfect(weatherSeconds, species.perfectWeather)
      updateGarden(placePlant(garden, { kind: 'flower', speciesId: species.id, perfect }, planting.slotIndex))
      goIdle(perfect ? `A perfect ${species.name} bloomed!` : `A ${species.name} bloomed.`)
    }

    const cancelTimer = startTimer(elements.display, remainingSeconds, onDone, onTick)
    elements.controls.querySelector<HTMLDivElement>('#cancel-button')!.addEventListener('click', () => {
      const ranSeconds = cancelTimer()
      countWeatherUpTo(ranSeconds)
      const grownSeconds = planting.startElapsedSeconds + ranSeconds
      if (grownSeconds > 0) {
        const sprout = { kind: 'sprout' as const, speciesId: species.id, elapsedSeconds: grownSeconds, weatherSeconds }
        updateGarden(placePlant(garden, sprout, planting.slotIndex))
      }
      goIdle()
    })
  }

  goIdle()
}
