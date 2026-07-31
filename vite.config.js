import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// basicSsl enables HTTPS — required for Geolocation (GPS) to work
// when opening the app from a phone over the LAN IP (browsers block
// location on plain http:// except localhost).
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy all /api requests to the backend — this fixes CORS
      '/api': {
        target: 'https://api.homecarenursing.cloud',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
