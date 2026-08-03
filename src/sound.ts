const DONE_SOUND_PATH = '/sounds/827122__xkeril__end-of-task-sound.wav'
const START_SOUND_PATH = '/sounds/827123__xkeril__startup-sound-computer.wav'

export function playDoneSound() {
  new Audio(DONE_SOUND_PATH).play()
}

export function playStartSound() {
  new Audio(START_SOUND_PATH).play()
}
