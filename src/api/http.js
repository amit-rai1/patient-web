import { API_BASE_URL } from '../config/env'

let authToken = ''

export function setAuthToken(token) {
  authToken = token || ''
}

const parseResponseDetailed = async (response) => {
  const rawText = await response.text()
  const contentType = response.headers.get('content-type') || ''
  let payload = null

  if (rawText && contentType.includes('application/json')) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      payload = null
    }
  }

  return { payload, rawText, contentType }
}

const getErrorMessage = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage
  if (typeof payload === 'string') return payload
  return payload.message || payload.error || payload.details || payload.title || fallbackMessage
}

export async function apiRequest(path, options = {}) {
  let response
  const headers = {
    Accept: '*/*',
    ...(options.headers || {}),
  }

  if (authToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${authToken}`
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const fullUrl = `${API_BASE_URL}${path}`

  try {
    response = await fetch(fullUrl, { ...options, headers })
  } catch (err) {
    throw new Error(`Unable to connect to the server. Please check your internet connection. (${err.message})`)
  }

  const { payload } = await parseResponseDetailed(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Something went wrong. Please try again.'))
  }

  return payload
}
