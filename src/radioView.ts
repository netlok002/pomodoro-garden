import { openModal } from './modal.ts'
import type { Spotify } from './spotify.ts'

// The radio's page: connect Spotify, choose the focus playlist, see what the music is doing.
export function openRadio(spotify: Spotify) {
  openModal((body) => {
    body.innerHTML = `
      <div class="book radio">
        <h2 class="book-title">Radio</h2>
        <p class="book-detail">Your playlist plays while a plant grows, and turns down between sessions.</p>
        <div class="radio-controls"></div>
        <p class="zip-status radio-status" role="status"></p>
        <p class="book-detail radio-note">Needs Spotify Premium. While the garden is in testing,
          your Spotify account must be added to the app first.</p>
      </div>
    `
    const controls = body.querySelector<HTMLElement>('.radio-controls')!
    const status = body.querySelector<HTMLElement>('.radio-status')!
    const showStatus = () => (status.textContent = spotify.status())

    const button = (label: string, onClick: () => void) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'book-action'
      element.textContent = label
      element.addEventListener('click', onClick)
      return element
    }

    const render = async () => {
      controls.replaceChildren()
      showStatus()
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
      showStatus()
    }

    void render()
  }, { panelClass: 'modal-page' })
}
