import { startTimer, formatTime } from './timer.ts'
import { nextEmptySlot, isFull, placePlant, removePlant, type Garden, type PendingBloom } from './garden.ts'
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
import { playTimerDone, playTimerStart } from './sfx.ts'
import { openSeedPicker } from './seedPicker.ts'
import { openWeatherPicker } from './weatherPicker.ts'
import { openBook } from './bookView.ts'
import { renderGarden } from './gardenView.ts'
import { renderForecast } from './forecastView.ts'
import { renderCelebration, renderGrowingPlant, renderSeedChoice } from './plantView.ts'

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
  bookButton: HTMLElement
}

export function initSession(elements: SessionElements) {
  const saved = loadState()
  let garden: Garden = saved.garden
  let book: Book = saved.book
  let weatherOverride: WeatherOverride | null = saved.weatherOverride
  let pendingBloom: PendingBloom | null = saved.pendingBloom
  let selectedSpeciesId = SPECIES[0].id

  const save = () => saveState({ garden, book, weatherOverride, pendingBloom, lastSeen: Date.now() })

  const updateGarden = (next: Garden) => {
    garden = next
    save()
  }

  const todayKey = () => localDateKey(new Date())
  const weatherNow = () => currentWeather(todayKey(), weatherOverride)

  const renderWeather = () => {
    const overriddenToday = weatherOverride?.date === todayKey()
    renderForecast(elements.forecast, forecast(new Date(), weatherOverride), () => {
      openWeatherPicker(overriddenToday ? weatherOverride!.weather : null, (choice) => {
        weatherOverride = choice ? { date: todayKey(), weather: choice } : null
        save()
        renderWeather()
      })
    })
  }

  const pressIntoBook = (speciesId: string, perfect: boolean) => {
    book = recordPick(book, speciesId, perfect ? 'perfect' : 'normal', todayKey())
    return `Pressed a ${perfect ? 'perfect ' : ''}${getSpecies(speciesId).name} into your book.`
  }

  const pickFlower = (slotIndex: number) => {
    const flower = garden[slotIndex]
    if (flower?.kind !== 'flower') return
    const note = pressIntoBook(flower.speciesId, flower.perfect)
    updateGarden(removePlant(garden, slotIndex))
    goIdle(note)
  }

  const goIdle = (note = '') => {
    const species = getSpecies(selectedSpeciesId)
    renderWeather()
    renderSeedChoice(elements.plant, species)
    renderGarden(elements.garden, garden, {
      onSproutClick: (slotIndex) => {
        const sprout = garden[slotIndex]
        if (sprout?.kind !== 'sprout') return
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

    playTimerStart()
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
      playTimerDone()
      // The bloom waits (saved, so a reload can't lose it) until the player chooses.
      // A resumed sprout's slot is cleared and held for it.
      const slotIndex = planting.slotIndex ?? nextEmptySlot(garden)
      if (planting.slotIndex !== undefined) garden = removePlant(garden, planting.slotIndex)
      pendingBloom = { speciesId: species.id, perfect: isPerfect(weatherSeconds, species.perfectWeather), slotIndex }
      save()
      goCelebrating(pendingBloom)
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

  // The fresh bloom is shown off first; it only reaches the garden or the book once chosen.
  const goCelebrating = (bloom: PendingBloom) => {
    const species = getSpecies(bloom.speciesId)
    renderWeather()
    renderCelebration(elements.plant, species, bloom.perfect)
    renderGarden(elements.garden, garden)
    elements.display.innerHTML = ''
    elements.note.textContent = ''
    elements.controls.innerHTML = `
      <div id="keep-button" class="select-option selected">❯ Plant in garden</div>
      <div id="pick-button" class="select-option">❯ Pick into book</div>
    `
    elements.controls.querySelector<HTMLDivElement>('#keep-button')!.addEventListener('click', () => {
      garden = placePlant(garden, { kind: 'flower', speciesId: bloom.speciesId, perfect: bloom.perfect }, bloom.slotIndex)
      pendingBloom = null
      save()
      goIdle(`Planted a ${bloom.perfect ? 'perfect ' : ''}${species.name} in your garden.`)
    })
    elements.controls.querySelector<HTMLDivElement>('#pick-button')!.addEventListener('click', () => {
      const note = pressIntoBook(bloom.speciesId, bloom.perfect)
      pendingBloom = null
      save()
      goIdle(note)
    })
  }

  elements.bookButton.addEventListener('click', () => openBook(book))

  if (pendingBloom) goCelebrating(pendingBloom)
  else goIdle()
}
