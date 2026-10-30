import { defineConfig, type Plugin } from 'vite'

// Only our own scripts may run, and the page may only talk to the two weather services.
// Inline style attributes are allowed because the views position things with them.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://api.zippopotam.us https://api.open-meteo.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

// Added to the published build only: the dev server needs its own live-reload connection.
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      ),
  }
}

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /pomodoro-garden/; locally it stays at the root.
  base: command === 'build' ? '/pomodoro-garden/' : '/',
  plugins: [contentSecurityPolicy()],
}))
