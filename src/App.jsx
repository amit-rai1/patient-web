import { useEffect, useMemo, useRef, useState } from 'react'
import { MdHome, MdEventNote, MdPerson } from 'react-icons/md'
import LoginScreen from './screens/LoginScreen'
import SignupScreen from './screens/SignupScreen'
import OtpScreen from './screens/OtpScreen'
import AboutScreen from './screens/AboutScreen'
import HomeScreen from './screens/HomeScreen'
import AppointmentsScreen from './screens/AppointmentsScreen'
import ProfileScreen from './screens/ProfileScreen'
import Toast from './components/Toast'
import {
  extractAuthToken,
  extractUser,
  loginWithPassword,
  registerUser,
  sendLoginOtp,
  verifyLoginOtp,
  verifySignupOtp,
  fetchUserProfile,
} from './api/auth'
import { setAuthToken } from './api/http'
import { normalizeImageUri } from './config/env'

const APP_TITLE = 'Home Care Nursing Services'
const normalizePhone = (value = '') => value.replace(/\D/g, '')

const createUserProfile = (user = {}, fallback = {}) => ({
  id: user.id || user.userId || user.UserId || fallback.id || fallback.userId || 0,
  name: user.fullName || user.name || fallback.name || 'Patient',
  email: user.email || fallback.email || '',
  phone: user.phone || user.phoneNumber || fallback.phone || fallback.phoneNumber || '',
  age: user.age || fallback.age || 28,
  gender: user.gender || fallback.gender || 'Not specified',
  bloodGroup: user.bloodGroup || fallback.bloodGroup || 'O+',
  city: user.city || fallback.city || 'Unknown',
  address: user.address || fallback.address || 'Not available',
  landmark: user.landmark || fallback.landmark || '',
  houseNumber: user.houseNumber || fallback.houseNumber || '',
  pinCode: user.pinCode || user.pincode || user.PinCode || fallback.pinCode || fallback.pincode || '',
  profileImage: normalizeImageUri(user.profileImage || user.userProfileImageUrl || user.userProfileImage || fallback.profileImage || '') || '',
  profileImageVersion: user.profileImageVersion || fallback.profileImageVersion || '',
  role: user.role || fallback.role || 'patient',
  token: user.token || fallback.token || '',
  isActive: user.isActive !== undefined ? user.isActive : user.IsActive !== undefined ? user.IsActive : true,
})

const getErrorMessage = (error, fallback) => error?.message || fallback

export default function App() {
  const toastTimerRef = useRef(null)
  const [user, setUser] = useState(null)
  const [pendingAuth, setPendingAuth] = useState(null)
  const [toast, setToast] = useState(null)
  const [authScreen, setAuthScreen] = useState('login') // login | about | signup | otp
  const [tab, setTab] = useState('home') // home | appointments | profile
  const [apptInitServiceType, setApptInitServiceType] = useState(null)
  const [apptBookingRequestId, setApptBookingRequestId] = useState(0)

  useEffect(() => {
    document.title = APP_TITLE
  }, [])

  const showToast = (message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2400)
  }

  const resolveUserFromPayload = async (payload, fallback = {}) => {
    const apiUser = extractUser(payload) || {}
    const token = extractAuthToken(payload)
    const userId = apiUser.id || apiUser.userId || apiUser.UserId

    // Guard: without a token or a user id the response is not a real login
    // (e.g. an empty 200 from a misconfigured proxy) — fail loudly instead
    // of entering the app with an anonymous, broken session.
    if (!token && !userId) {
      throw new Error('Unexpected response from the server. Please try again later.')
    }

    setAuthToken(token)

    let profileData = apiUser
    if (userId) {
      try {
        const profilePayload = await fetchUserProfile(userId)
        const fetchedUser = extractUser(profilePayload) || {}
        profileData = { ...apiUser, ...fetchedUser }
      } catch {
        /* fallback to login response */
      }
    }
    return createUserProfile({ ...profileData, token }, fallback)
  }

  const handlePasswordLogin = async (identifier, password) => {
    try {
      const payload = await loginWithPassword({ emailOrPhone: identifier.trim(), password })
      const resolvedUser = await resolveUserFromPayload(payload, {
        email: identifier.includes('@') ? identifier.trim().toLowerCase() : '',
        phone: identifier.includes('@') ? '' : normalizePhone(identifier),
      })
      setUser(resolvedUser)
      setTab('home')
      showToast(`Welcome back, ${resolvedUser.name.split(' ')[0]}.`, 'success')
      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to sign in. Please try again.')
      showToast(message, 'error')
      return { ok: false, error: message }
    }
  }

  const handleSendOtpLogin = async (identifier) => {
    const phoneNumber = normalizePhone(identifier.trim())
    if (phoneNumber.length < 10) {
      const message = 'Please enter a valid phone number for OTP login.'
      showToast(message, 'error')
      return { ok: false, error: message }
    }
    try {
      await sendLoginOtp({ phoneNumber })
      setPendingAuth({ type: 'login-otp', phoneNumber, contact: phoneNumber })
      setAuthScreen('otp')
      showToast('OTP sent successfully.', 'success')
      return { ok: true, contact: phoneNumber }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to send OTP. Please try again.')
      showToast(message, 'error')
      return { ok: false, error: message }
    }
  }

  const handleRegister = async (registrationData) => {
    try {
      await registerUser(registrationData)
      setPendingAuth({
        type: 'signup',
        user: registrationData,
        phoneNumber: normalizePhone(registrationData.phoneNumber),
        contact: registrationData.phoneNumber,
      })
      setAuthScreen('otp')
      showToast('Registration OTP sent.', 'success')
      return { ok: true, contact: registrationData.phoneNumber }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to register. Please try again.')
      showToast(message, 'error')
      return { ok: false, error: message }
    }
  }

  const handleVerifyOtp = async (inputOtp) => {
    if (!pendingAuth) {
      showToast('No OTP request is active.', 'error')
      return { ok: false, error: 'No OTP request is active. Please start again.' }
    }
    try {
      if (pendingAuth.type === 'signup') {
        await verifySignupOtp({ phoneNumber: pendingAuth.phoneNumber, otp: inputOtp })
        setPendingAuth(null)
        showToast('Account created successfully. Please login to continue.', 'success')
        return { ok: true, redirect: 'login' }
      }

      const payload = await verifyLoginOtp({ phoneNumber: pendingAuth.phoneNumber, otp: inputOtp })
      const resolvedUser = await resolveUserFromPayload(payload, { phone: pendingAuth.phoneNumber })
      setUser(resolvedUser)
      setTab('home')
      showToast('OTP verified successfully.', 'success')
      setPendingAuth(null)
      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, 'Invalid or expired OTP. Please try again.')
      showToast(message, 'error')
      return { ok: false, error: message }
    }
  }

  const handleResendOtp = async () => {
    if (!pendingAuth) {
      showToast('No OTP request is active.', 'error')
      return { ok: false, error: 'No OTP request is active. Please start again.' }
    }
    try {
      if (pendingAuth.type === 'login-otp') {
        await sendLoginOtp({ phoneNumber: pendingAuth.phoneNumber })
      } else {
        await registerUser(pendingAuth.user)
      }
      showToast('OTP resent successfully.', 'success')
      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to resend OTP. Please try again.')
      showToast(message, 'error')
      return { ok: false, error: message }
    }
  }

  const handleBookFromHome = (serviceType) => {
    setApptInitServiceType(serviceType || 'day')
    setApptBookingRequestId((c) => c + 1)
    setTab('appointments')
  }

  const handleProfileUpdated = (updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }))
    showToast('Profile updated successfully.', 'success')
  }

  const handleLogout = () => {
    setAuthToken('')
    setUser(null)
    setPendingAuth(null)
    setAuthScreen('login')
    setTab('home')
    showToast('Logged out successfully.', 'info')
  }

  const navItems = useMemo(
    () => [
      { id: 'home', label: 'Home', icon: MdHome },
      { id: 'appointments', label: 'Appointments', icon: MdEventNote },
      { id: 'profile', label: 'Profile', icon: MdPerson },
    ],
    []
  )

  /* ---------- AUTH FLOW ---------- */
  if (!user) {
    return (
      <>
        {authScreen === 'login' && (
          <LoginScreen
            onPasswordLogin={handlePasswordLogin}
            onOtpLogin={handleSendOtpLogin}
            onNavigate={(screen) => setAuthScreen(screen)}
          />
        )}
        {authScreen === 'about' && <AboutScreen onBack={() => setAuthScreen('login')} />}
        {authScreen === 'signup' && <SignupScreen onRegister={handleRegister} onNavigate={(screen) => setAuthScreen(screen)} />}
        {authScreen === 'otp' && (
          <OtpScreen
            authType={pendingAuth?.type}
            contact={pendingAuth?.contact}
            onVerifyOtp={handleVerifyOtp}
            onResendOtp={handleResendOtp}
            onNavigate={(screen) => setAuthScreen(screen)}
          />
        )}
        <Toast toast={toast} />
      </>
    )
  }

  /* ---------- MAIN APP ---------- */
  return (
    <div className="main-app active">
      {tab === 'home' && <HomeScreen user={user} onBookAppointment={handleBookFromHome} />}
      {tab === 'appointments' && (
        <AppointmentsScreen
          key={apptBookingRequestId}
          user={user}
          onAppointmentCreated={() => showToast('Appointment booked successfully.', 'success')}
          initialServiceType={apptInitServiceType}
          initialTab={apptInitServiceType ? 'form' : 'list'}
        />
      )}
      {tab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} />}

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <Toast toast={toast} />
    </div>
  )
}
