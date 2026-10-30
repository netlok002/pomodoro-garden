// The game's screens: idle (choose a seed, tend the garden) → growing (the timer runs)
// → celebrating (the bloom waits to be planted or picked). The saved game lives in
// gameState and the weather in weatherController; this file only drives the screens.
import { startTimer, formatTime } from './views/timer.ts'
import { nextEmptySlot, isFull, placePlant, removePlant, type PendingBloom } from './game/garden.ts'
import { recordPick } from './game/book.ts'
import { localDateKey } from './game/dates.ts'
import { SPECIES, getSpecies } from './game/species.ts'
import { addWeatherTime, isPerfect, type WeatherTally } from './weather/weather.ts'
import { requestPersistentStorage } from './save/storage.ts'
import { decodeSave, encodeSave } from './save/saveCode.ts'
import { createGameState } from './game/gameState.ts'
import { createWeatherController } from './weather/weatherController.ts'
import { playTimerDone, playTimerStart } from './audio/sfx.ts'
import { openSeedPicker } from './views/seedPicker.ts'
import { openWeatherPicker } from './views/weatherPicker.ts'
import { openBook } from './views/bookView.ts'
import { renderGarden } from './views/gardenView.ts'
import { renderForecast } from './views/forecastView.ts'
import { renderCelebration, renderGrowingPlant, renderSeedChoice } from './views/plantView.ts'

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
  const game = createGameState()
  const weather = createWeatherController(game, { onChange: () => renderWeather() })
  let selectedSpeciesId = SPECIES[0].id
  let growing = false

  const todayKey = () => localDateKey(new Date())

  const renderWeather = () => {
    renderForecast(elements.forecast, weather.forecast(), () => {
      openWeatherPicker(weather.overrideToday(), weather.setOverride)
    })
  }

  const pressIntoBook = (speciesId: string, perfect: boolean) => {
    game.update({ book: recordPick(game.current.book, speciesId, perfect ? 'perfect' : 'normal', todayKey()) })
    return `Pressed a ${perfect ? 'perfect ' : ''}${getSpecies(speciesId).name} into your book.`
  }

  const pickFlower = (slotIndex: number) => {
    const flower = game.current.garden[slotIndex]
    if (flower?.kind !== 'flower') return
    const note = pressIntoBook(flower.speciesId, flower.perfect)
    game.update({ garden: removePlant(game.current.garden, slotIndex) })
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
    const sprout = slotIndex === null ? null : game.current.garden[slotIndex]
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
    void weather.refresh()
    renderIdleCenter()
    renderGarden(elements.garden, game.current.garden, {
      onSproutClick: (slotIndex) => {
        const sprout = game.current.garden[slotIndex]
        if (sprout?.kind !== 'sprout') return
        goGrowing({
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

    if (isFull(game.current.garden)) {
      elements.controls.innerHTML = '<div class="select-option disabled">Your garden is full — click a flower to pick it</div>'
      return
    }
    elements.controls.innerHTML = '<div id="start-button" class="select-option selected">❯ Plant</div>'
    elements.controls.querySelector<HTMLDivElement>('#start-button')!.addEventListener('click', () => {
      goGrowing({ speciesId: selectedSpeciesId, startElapsedSeconds: 0, weatherSeconds: {} })
    })
  }

  const goGrowing = (planting: Planting) => {
    const species = getSpecies(planting.speciesId)
    const remainingSeconds = species.durationMinutes * 60 - planting.startElapsedSeconds

    // Each tick credits the seconds since the last tick to whatever the weather is right now.
    let weatherSeconds = planting.weatherSeconds
    let countedSeconds = 0
    const countWeatherUpTo = (elapsedSeconds: number) => {
      const newSeconds = elapsedSeconds - countedSeconds
      if (newSeconds <= 0) return
      weatherSeconds = addWeatherTime(weatherSeconds, weather.now(), newSeconds)
      countedSeconds = elapsedSeconds
    }

    const stopGrowing = () => {
      growing = false
      hooks.onFocusEnd?.()
    }

    playTimerStart()
    growing = true
    hooks.onFocusStart?.()
    requestPersistentStorage()
    renderWeather()
    elements.note.textContent = ''
    renderGarden(elements.garden, game.current.garden)
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
      stopGrowing()
      playTimerDone()
      // The bloom waits (saved, so a reload can't lose it) until the player chooses.
      // A resumed sprout's slot is cleared and held for it.
      const { garden } = game.current
      const slotIndex = planting.slotIndex ?? nextEmptySlot(garden)
      const bloom: PendingBloom = {
        speciesId: species.id,
        perfect: isPerfect(weatherSeconds, species.perfectWeather),
        slotIndex,
      }
      game.update({
        garden: planting.slotIndex !== undefined ? removePlant(garden, planting.slotIndex) : garden,
        pendingBloom: bloom,
      })
      goCelebrating(bloom)
    }

    const cancelTimer = startTimer(elements.display, remainingSeconds, onDone, onTick)
    elements.controls.querySelector<HTMLDivElement>('#cancel-button')!.addEventListener('click', () => {
      const ranSeconds = cancelTimer()
      stopGrowing()
      countWeatherUpTo(ranSeconds)
      const grownSeconds = planting.startElapsedSeconds + ranSeconds
      if (grownSeconds > 0) {
        const sprout = { kind: 'sprout' as const, speciesId: species.id, elapsedSeconds: grownSeconds, weatherSeconds }
        game.update({ garden: placePlant(game.current.garden, sprout, planting.slotIndex) })
      }
      goIdle()
    })
  }

  // The fresh bloom is shown off first; it only reaches the garden or the book once chosen.
  const goCelebrating = (bloom: PendingBloom) => {
    const species = getSpecies(bloom.speciesId)
    renderWeather()
    renderCelebration(elements.plant, species, bloom.perfect)
    renderGarden(elements.garden, game.current.garden)
    elements.display.innerHTML = ''
    elements.note.textContent = ''
    elements.controls.innerHTML = `
      <div id="keep-button" class="select-option selected">❯ Plant in garden</div>
      <div id="pick-button" class="select-option">❯ Pick into book</div>
    `
    elements.controls.querySelector<HTMLDivElement>('#keep-button')!.addEventListener('click', () => {
      const flower = { kind: 'flower' as const, speciesId: bloom.speciesId, perfect: bloom.perfect }
      game.update({ garden: placePlant(game.current.garden, flower, bloom.slotIndex), pendingBloom: null })
      goIdle(`Planted a ${bloom.perfect ? 'perfect ' : ''}${species.name} in your garden.`)
    })
    elements.controls.querySelector<HTMLDivElement>('#pick-button')!.addEventListener('click', () => {
      const note = pressIntoBook(bloom.speciesId, bloom.perfect)
      game.update({ pendingBloom: null })
      goIdle(note)
    })
  }

  // Replaces the whole game with a pasted save code (already cleaned by decodeSave).
  const loadSaveCode = (code: string) => {
    if (growing) return { loaded: false, message: 'Finish or stop your current planting before loading a save.' }
    const loaded = decodeSave(code, Date.now())
    if (!loaded) return { loaded: false, message: "That doesn't look like a garden save code." }
    game.replace(loaded)
    weather.resetProblems()
    showCurrentScreen('Save loaded. Welcome back to your garden.')
    return { loaded: true, message: 'Save loaded.' }
  }

  const showCurrentScreen = (note = '') => {
    const { pendingBloom } = game.current
    if (pendingBloom) goCelebrating(pendingBloom)
    else goIdle(note)
  }

  elements.bookButton.addEventListener('click', () =>
    openBook(game.current.book, {
      zip: game.current.place?.zip ?? '',
      weatherStatus: weather.status(),
      onSaveZip: weather.saveZip,
      onClearZip: weather.clearZip,
      saveCode: encodeSave(game.current),
      onLoadSaveCode: loadSaveCode,
    }),
  )

  showCurrentScreen()
}
