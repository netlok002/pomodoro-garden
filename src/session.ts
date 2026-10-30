import { startTimer, formatTime } from './timer.ts'
import { nextEmptySlot, isFull, placePlant, removePlant, type Garden, type PendingBloom } from './garden.ts'
import { recordPick, type Book } from './book.ts'
import { localDateKey } from './dates.ts'
import { SPECIES, getSpecies } from './species.ts'
import {
  addWeatherTime,
  forecast,
  isPerfect,
  type WeatherOverride,
  type WeatherTally,
} from './weather.ts'
import { loadState, requestPersistentStorage, saveState } from './storage.ts'
import { decodeSave, encodeSave } from './saveCode.ts'
import {
  ZipNotFoundError,
  fetchRealForecast,
  isFresh,
  isValidZip,
  lookupZip,
  type CachedForecast,
  type Place,
} from './realWeather.ts'
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

// Optional listeners for when focus starts and ends (used for music).
export interface SessionHooks {
  onFocusStart?: () => void
  onFocusEnd?: () => void
}

export function initSession(elements: SessionElements, hooks: SessionHooks = {}) {
  const saved = loadState()
  let garden: Garden = saved.garden
  let book: Book = saved.book
  let weatherOverride: WeatherOverride | null = saved.weatherOverride
  let pendingBloom: PendingBloom | null = saved.pendingBloom
  let place: Place | null = saved.place
  let forecastCache: CachedForecast | null = saved.forecastCache
  let selectedSpeciesId = SPECIES[0].id
  let growing = false

  const save = () =>
    saveState({ garden, book, weatherOverride, pendingBloom, place, forecastCache, lastSeen: Date.now() })

  const updateGarden = (next: Garden) => {
    garden = next
    save()
  }

  const todayKey = () => localDateKey(new Date())

  // Real weather: used only while today's cached forecast matches the saved zip.
  let refreshing = false
  let refreshFailed = false
  const realForecast = () => (place && isFresh(forecastCache, todayKey(), place.zip) ? forecastCache!.forecast : null)
  const currentForecast = () => forecast(new Date(), weatherOverride, realForecast())
  const weatherNow = () => currentForecast().today

  const refreshForecast = async () => {
    if (!place || refreshing || realForecast()) return
    refreshing = true
    try {
      forecastCache = { date: todayKey(), zip: place.zip, forecast: await fetchRealForecast(place) }
      refreshFailed = false
      save()
      renderWeather()
    } catch {
      refreshFailed = true
    } finally {
      refreshing = false
    }
  }

  const weatherStatus = () => {
    if (!place) return 'No zip code set, so the weather is simulated.'
    const where = `${place.name}, ${place.state}`
    if (realForecast()) return `Growing under the real forecast for ${where}.`
    if (refreshFailed) return `Couldn't reach the weather service for ${where}, so the weather is simulated for now.`
    return `Fetching the forecast for ${where}…`
  }

  const saveZip = async (zip: string) => {
    if (!isValidZip(zip)) return 'Please enter a 5-digit US zip code.'
    try {
      place = await lookupZip(zip)
    } catch (error) {
      return error instanceof ZipNotFoundError
        ? `Couldn't find zip code ${zip.trim()}.`
        : "Couldn't reach the zip code lookup. Check your connection and try again."
    }
    forecastCache = null
    save()
    await refreshForecast()
    renderWeather()
    return weatherStatus()
  }

  const clearZip = () => {
    place = null
    forecastCache = null
    refreshFailed = false
    save()
    renderWeather()
    return weatherStatus()
  }

  const renderWeather = () => {
    const overriddenToday = weatherOverride?.date === todayKey()
    renderForecast(elements.forecast, currentForecast(), () => {
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

  // The middle of the screen while idle: the chosen seed and its time, which opens the seed picker.
  const renderIdleCenter = () => {
    const species = getSpecies(selectedSpeciesId)
    renderSeedChoice(elements.plant, species)
    elements.display.innerHTML = `<span id="timer-value" class="timer-value">${formatTime(species.durationMinutes * 60)}</span>`
    elements.display.querySelector<HTMLSpanElement>('#timer-value')!.addEventListener('click', () => {
      openSeedPicker(selectedSpeciesId, (speciesId) => {
        selectedSpeciesId = speciesId
        goIdle()
      })
    })
  }

  // Hovering a sprout previews it in the middle: how far it has grown and the time it has left.
  const previewSprout = (slotIndex: number | null) => {
    const sprout = slotIndex === null ? null : garden[slotIndex]
    if (sprout?.kind !== 'sprout') {
      renderIdleCenter()
      return
    }
    const species = getSpecies(sprout.speciesId)
    renderGrowingPlant(elements.plant, species, sprout.elapsedSeconds)
    const secondsLeft = species.durationMinutes * 60 - sprout.elapsedSeconds
    elements.display.innerHTML = `<span class="timer-preview">${formatTime(secondsLeft)}</span>`
  }

  const goIdle = (note = '') => {
    renderWeather()
    void refreshForecast()
    renderIdleCenter()
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
      onSproutHover: previewSprout,
    })
    elements.note.textContent = note

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
    growing = true
    hooks.onFocusStart?.()
    requestPersistentStorage()
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
      growing = false
      hooks.onFocusEnd?.()
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
      growing = false
      hooks.onFocusEnd?.()
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

  // Replaces the whole game with a pasted save code (already cleaned by decodeSave).
  const loadSaveCode = (code: string) => {
    if (growing) return { loaded: false, message: 'Finish or stop your current planting before loading a save.' }
    const loaded = decodeSave(code, Date.now())
    if (!loaded) return { loaded: false, message: "That doesn't look like a garden save code." }
    garden = loaded.garden
    book = loaded.book
    weatherOverride = loaded.weatherOverride
    pendingBloom = loaded.pendingBloom
    place = loaded.place
    forecastCache = loaded.forecastCache
    refreshFailed = false
    save()
    showCurrentScreen('Save loaded. Welcome back to your garden.')
    return { loaded: true, message: 'Save loaded.' }
  }

  const showCurrentScreen = (note = '') => {
    if (pendingBloom) goCelebrating(pendingBloom)
    else goIdle(note)
  }

  elements.bookButton.addEventListener('click', () =>
    openBook(book, {
      zip: place?.zip ?? '',
      weatherStatus: weatherStatus(),
      onSaveZip: saveZip,
      onClearZip: clearZip,
      saveCode: encodeSave({ garden, book, weatherOverride, pendingBloom, place, forecastCache, lastSeen: Date.now() }),
      onLoadSaveCode: loadSaveCode,
    }),
  )

  showCurrentScreen()
}
