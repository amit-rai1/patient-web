import { apiRequest } from './http'

const normalizePhone = (value = '') => value.replace(/\D/g, '')
const normalizePinCode = (value = '') => value.replace(/\D/g, '')

const appendIfPresent = (params, key, value) => {
  if (value !== undefined && value !== null) {
    const stringValue = typeof value === 'boolean' ? String(value).toLowerCase() : String(value)
    params.append(key, stringValue)
  }
}

const appendProfileImage = (formData, image) => {
  if (!image) return
  if (image instanceof File || image instanceof Blob) {
    formData.append('UserProfileImageUrl', image, image.name || 'profile.jpg')
    return
  }
  if (typeof image === 'object' && image.file) {
    formData.append('UserProfileImageUrl', image.file, image.name || 'profile.jpg')
  }
}

export async function updateUserProfile(id, data) {
  const params = new URLSearchParams()
  const formData = new FormData()

  appendIfPresent(params, 'Name', data.name)
  appendIfPresent(params, 'Email', data.email)
  appendIfPresent(params, 'PhoneNumber', normalizePhone(data.phoneNumber || data.phone || ''))
  appendIfPresent(params, 'Address', data.address)
  appendIfPresent(params, 'Landmark', data.landmark || '')
  appendIfPresent(params, 'HouseNumber', data.houseNumber)
  appendIfPresent(params, 'PinCode', normalizePinCode(data.pinCode || data.pincode || ''))
  appendIfPresent(params, 'Gender', data.gender)
  if (data.isActive !== undefined) appendIfPresent(params, 'IsActive', data.isActive)

  const hasImage = !!(data.userProfileImageUrl || data.profileImage)
  if (hasImage) {
    appendProfileImage(formData, data.userProfileImageUrl || data.profileImage)
  }

  return apiRequest(`/users/${id}?${params.toString()}`, {
    method: 'PUT',
    ...(hasImage && { body: formData, headers: { Accept: '*/*' } }),
  })
}

export async function registerUser(data) {
  const params = new URLSearchParams()

  appendIfPresent(params, 'Name', data.name)
  appendIfPresent(params, 'Email', data.email)
  appendIfPresent(params, 'PhoneNumber', normalizePhone(data.phoneNumber))
  appendIfPresent(params, 'PinCode', normalizePinCode(data.pinCode || data.pincode))
  appendIfPresent(params, 'Password', data.password)
  appendIfPresent(params, 'Address', data.address)
  appendIfPresent(params, 'Landmark', data.landmark || '')
  appendIfPresent(params, 'HouseNumber', data.houseNumber)
  appendIfPresent(params, 'Role', data.role || 'patient')
  appendIfPresent(params, 'Gender', data.gender)

  const image = data.userProfileImageUrl || data.profileImage || data.profileImageFile

  if (image) {
    const formData = new FormData()
    appendProfileImage(formData, image)
    return apiRequest(`/auth/register?${params.toString()}`, {
      method: 'POST',
      headers: { Accept: '*/*' },
      body: formData,
    })
  }

  return apiRequest(`/auth/register?${params.toString()}`, { method: 'POST' })
}

export async function loginWithPassword({ emailOrPhone, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      emailOrPhone: emailOrPhone.includes('@') ? emailOrPhone.trim().toLowerCase() : normalizePhone(emailOrPhone),
      password,
    }),
  })
}

export async function sendLoginOtp({ phoneNumber }) {
  return apiRequest('/auth/login/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: normalizePhone(phoneNumber) }),
  })
}

export async function verifyLoginOtp({ phoneNumber, otp }) {
  return apiRequest('/auth/login/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: normalizePhone(phoneNumber), otp: otp.trim() }),
  })
}

export async function verifySignupOtp({ phoneNumber, otp }) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: normalizePhone(phoneNumber), otp: otp.trim() }),
  })
}

export async function fetchUserProfile(userId) {
  return apiRequest(`/users/${userId}`, { method: 'GET' })
}

export function getAuthPayloadData(payload) {
  if (!payload || typeof payload !== 'object') return null
  return payload.data || payload.result || payload.user || payload
}

export function extractAuthToken(payload) {
  const source = getAuthPayloadData(payload) || payload
  if (!source || typeof source !== 'object') return ''
  return source.token || source.accessToken || source.jwt || ''
}

export function extractUser(payload) {
  const source = getAuthPayloadData(payload) || {}
  const user = source.user || source.patient || source.profile || source
  if (!user || typeof user !== 'object') return null
  return user
}
