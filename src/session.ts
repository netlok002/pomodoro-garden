// The game's screens: idle (choose a seed, tend the garden) → growing (the timer runs)
// → celebrating (the bloom waits to be planted or picked). The saved game lives in
// gameState and the weather in weatherController; this file only drives the screens.
import { formatTime } from './views/timer.ts'
import { nextEmptySlot, isFull, placePlant, removePlant, type PendingBloom } from './game/garden.ts'
import { recordPick } from './game/book.ts'
import { localDateKey } from './game/dates.ts'
import { SPECIES, getSpecies } from './game/species.ts'
import { isPerfect } from './weather/weather.ts'
import { requestPersistentStorage } from './save/storage.ts'
import { decodeSave, encodeSave } from './save/saveCode.ts'
import { createGameState, type GameChanges } from './game/gameState.ts'
import { advanceRun, isRunDone, startRun, type GrowingRun } from './game/growingRun.ts'
import { getSpeed } from './util/devSpeed.ts'
import { createWeatherController } from './weather/weatherController.ts'
import { playTimerDone, playTimerStart } from './audio/sfx.ts'
import { openSeedPicker } from './views/seedPicker.ts'
import { openWeatherPicker } from './views/weatherPicker.ts'
import { openBook } from './views/bookView.ts'
import { renderGarden } from './views/gardenView.ts'
import { renderForecast } from './views/forecastView.ts'
import { renderCelebration, renderGrowingPlant, renderSeedChoice } from './views/plantView.ts'

// How often the growing screen catches up with real time.
const TICK_MS = 250

// True on devices with a mouse or trackpad; false on phones and tablets.
const canHover = () => matchMedia('(hover: hover)').matches

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
    const secondsLeft = Math.ceil(species.durationMinutes * 60 - sprout.elapsedSeconds)
    elements.display.innerHTML = `<span class="timer-preview">${formatTime(secondsLeft)}</span>`
  }

  const goIdle = (note = '') => {
    renderWeather()
    void weather.refresh()
    renderIdleCenter()
    renderGarden(elements.garden, game.current.garden, {
      // With a mouse, hovering previews and a click resumes. On a touch screen there's
      // no hover, so a tap previews first and the player confirms with Resume.
      onSproutClick: (slotIndex) => (canHover() ? resumeSprout(slotIndex) : chooseSprout(slotIndex)),
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
      beginGrowing(startRun(selectedSpeciesId, Date.now()))
    })
  }

  const resumeSprout = (slotIndex: number) => {
    const sprout = game.current.garden[slotIndex]
    if (sprout?.kind !== 'sprout') return
    const { elapsedSeconds, weatherSeconds } = sprout
    beginGrowing(startRun(sprout.speciesId, Date.now(), { elapsedSeconds, weatherSeconds, slotIndex }))
  }

  // Touch screens: show the tapped sprout in the middle with Resume and Back.
  const chooseSprout = (slotIndex: number) => {
    previewSprout(slotIndex)
    elements.controls.innerHTML = `
      <div id="resume-button" class="select-option selected">❯ Resume</div>
      <div id="back-button" class="select-option">❯ Back</div>
    `
    elements.controls.querySelector('#resume-button')!.addEventListener('click', () => resumeSprout(slotIndex))
    elements.controls.querySelector('#back-button')!.addEventListener('click', () => goIdle())
  }

  // Starting (or resuming a sprout): save the run, then show it growing.
  const beginGrowing = (run: GrowingRun) => {
    game.update({ growing: run })
    playTimerStart()
    hooks.onFocusStart?.()
    requestPersistentStorage()
    goGrowing()
  }

  // The growing screen. The run is saved and kept in real time: each tick adds the time
  // that really passed, so a locked phone or a backgrounded tab catches up on its own.
  const goGrowing = () => {
    const species = getSpecies(game.current.growing!.speciesId)
    const totalSeconds = species.durationMinutes * 60

    renderWeather()
    elements.note.textContent = ''
    renderGarden(elements.garden, game.current.garden)
    elements.controls.innerHTML = `
      <div class="select-option disabled">&nbsp; Growing...</div>
      <div id="cancel-button" class="select-option">❯ Stop</div>
    `

    const catchUp = () => {
      const run = advanceRun(game.current.growing!, Date.now(), getSpeed(), weather.now())
      game.update({ growing: run })
      return run
    }

    const render = (run: GrowingRun) => {
      elements.display.textContent = formatTime(Math.max(0, Math.ceil(totalSeconds - run.elapsedSeconds)))
      renderGrowingPlant(elements.plant, species, run.elapsedSeconds)
    }

    const stop = () => {
      clearInterval(ticker)
      document.removeEventListener('visibilitychange', onVisible)
      hooks.onFocusEnd?.()
    }

    const finish = (run: GrowingRun) => {
      stop()
      playTimerDone()
      // The bloom waits (saved, so a reload can't lose it) until the player chooses.
      // A resumed sprout's slot is cleared and held for it.
      const { garden } = game.current
      const slotIndex = run.slotIndex ?? nextEmptySlot(garden)
      const bloom: PendingBloom = {
        speciesId: species.id,
        perfect: isPerfect(run.weatherSeconds, species.perfectWeather),
        slotIndex,
      }
      game.update({
        garden: run.slotIndex !== null ? removePlant(garden, run.slotIndex) : garden,
        pendingBloom: bloom,
        growing: null,
      })
      goCelebrating(bloom)
    }

    const tick = () => {
      const run = catchUp()
      if (isRunDone(run)) finish(run)
      else render(run)
    }

    // Coming back to the tab (or unlocking the phone) catches up straight away.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }

    const ticker = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisible)

    elements.controls.querySelector<HTMLDivElement>('#cancel-button')!.addEventListener('click', () => {
      const run = catchUp()
      stop()
      // At least a second of growth leaves a sprout; a mis-tap leaves nothing behind.
      const update: GameChanges = { growing: null }
      if (run.elapsedSeconds >= 1) {
        const sprout = {
          kind: 'sprout' as const,
          speciesId: species.id,
          elapsedSeconds: run.elapsedSeconds,
          weatherSeconds: run.weatherSeconds,
        }
        update.garden = placePlant(game.current.garden, sprout, run.slotIndex ?? undefined)
      }
      game.update(update)
      goIdle()
    })

    tick()
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
    if (game.current.growing) return { loaded: false, message: 'Finish or stop your current planting before loading a save.' }
    const loaded = decodeSave(code, Date.now())
    if (!loaded) return { loaded: false, message: "That doesn't look like a garden save code." }
    game.replace(loaded)
    weather.resetProblems()
    showCurrentScreen('Save loaded. Welcome back to your garden.')
    return { loaded: true, message: 'Save loaded.' }
  }

  // Opening the app picks up wherever the player left off: a plant still growing
  // (which may have finished while they were away), a bloom waiting, or the idle garden.
  const showCurrentScreen = (note = '') => {
    const { growing, pendingBloom } = game.current
    if (growing) goGrowing()
    else if (pendingBloom) goCelebrating(pendingBloom)
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
