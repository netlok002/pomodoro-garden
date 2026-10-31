import { openModal } from './modal.ts'
import type { Spotify } from '../spotify/spotify.ts'

// The radio's page: connect Spotify, choose the focus playlist, see what the music is doing.
export function openRadio(spotify: Spotify) {
  openModal((body) => {
    body.innerHTML = `
      <div class="paper-page radio">
        <h2 class="page-title">Radio</h2>
        <p class="radio-now" hidden>
          <span class="radio-bubble-heading">Now playing</span>
          <span class="radio-now-text"></span>
        </p>
        <p class="page-note">Your playlist plays while a plant grows, and turns down between sessions.</p>
        <p class="page-note">A newly chosen playlist starts the next time you plant a seed. If your
          playlists don't show up, close the radio and open it again.</p>
        <div class="radio-controls"></div>
        <p class="status-line radio-status" role="status"></p>
        <p class="page-note radio-note">Needs Spotify Premium. While the garden is in testing,
          your Spotify account must be added to the app first.</p>
      </div>
    `
    const controls = body.querySelector<HTMLElement>('.radio-controls')!
    const status = body.querySelector<HTMLElement>('.radio-status')!
    const showStatus = () => (status.textContent = spotify.status())

    // The song playing right now, so phones (which can't hover the radio) still see it.
    const nowPlaying = body.querySelector<HTMLElement>('.radio-now')!
    const showNowPlaying = async () => {
      if (!spotify.isConnected()) {
        nowPlaying.hidden = true
        return
      }
      body.querySelector<HTMLElement>('.radio-now-text')!.textContent = await spotify.nowPlaying()
      nowPlaying.hidden = false
    }

    const button = (label: string, onClick: () => void) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'paper-button'
      element.textContent = label
      element.addEventListener('click', onClick)
      return element
    }

    const render = async () => {
      controls.replaceChildren()
      showStatus()
      void showNowPlaying()
      if (!spotify.isSetUp()) return
      if (!spotify.isConnected()) {
        controls.append(button('Connect Spotify', () => void spotify.connect()))
        return
      }

      // Playlist names come from Spotify and could contain anything, so they are only
      // ever set as text, never as HTML.
      const select = document.createElement('select')
      select.className = 'radio-playlists'
      select.setAttribute('aria-label', 'Focus playlist')
      const loading = document.createElement('option')
      loading.textContent = 'Loading your playlists…'
      select.append(loading)
      controls.append(select, button('Disconnect', () => {
        spotify.disconnect()
        void render()
      }))

      const playlists = await spotify.listPlaylists()
      select.replaceChildren()
      const prompt = document.createElement('option')
      prompt.value = ''
      prompt.textContent = playlists.length ? 'Choose a playlist' : 'No playlists found'
      select.append(prompt)
      for (const playlist of playlists) {
        const option = document.createElement('option')
        option.value = playlist.uri
        option.textContent = playlist.name
        option.selected = playlist.uri === spotify.playlist()?.uri
        select.append(option)
      }
      select.addEventListener('change', () => {
        const chosen = playlists.find((playlist) => playlist.uri === select.value)
        if (chosen) spotify.choosePlaylist({ uri: chosen.uri, name: chosen.name })
        showStatus()
      })

      await renderDevicePicker()
      showStatus()
    }

    // "Play on": automatic (this phone or this computer), or a specific device. Device
    // names come from Spotify, so like playlists they're only ever set as text.
    const renderDevicePicker = async () => {
      const label = document.createElement('label')
      label.className = 'radio-device'
      label.textContent = 'Play on '
      const picker = document.createElement('select')
      picker.className = 'radio-playlists'
      label.append(picker)
      controls.append(label)

      const option = (value: string, text: string) => {
        const element = document.createElement('option')
        element.value = value
        element.textContent = text
        return element
      }
      const devices = await spotify.listDevices()
      const picked = spotify.device()
      picker.append(option('', 'Automatic (this device)'))
      for (const device of devices) picker.append(option(device.id, `${device.name} (${device.type.toLowerCase()})`))
      if (picked && !devices.some((device) => device.id === picked.id)) {
        picker.append(option(picked.id, `${picked.name} (not available right now)`))
      }
      picker.value = picked?.id ?? ''

      picker.addEventListener('change', () => {
        const device = devices.find((candidate) => candidate.id === picker.value)
        spotify.chooseDevice(device ? { id: device.id, name: device.name } : picker.value ? picked : null)
        showStatus()
      })
    }

    void render()
  }, { panelClass: 'modal-page', closeButton: true })
}
