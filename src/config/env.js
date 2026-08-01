// API base URL.
// All API calls go directly to the backend server:
//   https://api.homecarenursing.cloud/api
// Dev: Vite proxies "/api" → https://api.homecarenursing.cloud (fixes CORS,
// see vite.config.js). You can override everything with VITE_API_BASE_URL.
// Note: calling the API directly cross-origin requires the API server to
// send CORS headers allowing this site's origin.
const PROD_API_BASE_URL = 'https://api.homecarenursing.cloud/api'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : PROD_API_BASE_URL)

export function normalizeImageUri(uri) {
  if (!uri) return null
  const value = typeof uri === 'object' && uri?.uri ? uri.uri : String(uri).trim()
  if (!value) return null

  if (/^http:\/\//i.test(value)) return `https://${value.slice(7)}`
  if (/^\/\//.test(value)) return `https:${value}`
  if (/^https?:\/\//i.test(value)) return value
  if (/^(file|content|data|blob):/i.test(value)) return value
  if (value.startsWith('/')) {
    // Images hosted on the API server — route through proxy too
    return `${API_BASE_URL}${value}`
  }
  return `${API_BASE_URL}/${value}`
}

export function withImageCacheBuster(uri, version) {
  const normalized = normalizeImageUri(uri)
  if (!normalized || !version) return normalized
  if (/^(file|data|blob):/i.test(normalized)) return normalized
  const sep = normalized.includes('?') ? '&' : '?'
  return `${normalized}${sep}v=${encodeURIComponent(String(version))}`
}
