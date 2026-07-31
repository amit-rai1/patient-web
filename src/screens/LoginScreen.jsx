import { useState } from 'react'
import { MdOutlineInfo, MdArrowForward, MdEmail, MdPhone, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function LoginScreen({ onPasswordLogin, onOtpLogin, onNavigate }) {
  const [mode, setMode] = useState('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!identifier.trim()) {
      setError('Please enter your email or phone number.')
      return
    }
    setLoading(true)

    if (mode === 'password') {
      if (!password) {
        setLoading(false)
        setError('Please enter your password.')
        return
      }
      const result = await onPasswordLogin(identifier.trim(), password)
      if (!result.ok) setError(result.error)
    } else {
      const result = await onOtpLogin(identifier.trim())
      if (!result.ok) setError(result.error)
    }
    setLoading(false)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleSubmit()
  }

  return (
    <div className="auth-screen">
      <form className="card" onSubmit={handleFormSubmit} noValidate>
        <h1 className="card-title">Patient Sign In</h1>
        <p className="card-subtitle">Login with password or receive OTP on your phone.</p>

        <button type="button" className="about-btn" onClick={() => onNavigate('about')} disabled={loading}>
          <span className="about-icon"><MdOutlineInfo /></span>
          <span className="about-copy">
            <span className="about-title">About this app</span>
            <span className="about-text">Care services, appointment flow, and patient support.</span>
          </span>
          <MdArrowForward className="about-arrow" />
        </button>

        <div className="mode-row">
          <button type="button" className={`mode-btn ${mode === 'password' ? 'mode-active' : ''}`} onClick={() => setMode('password')} disabled={loading}>
            Password
          </button>
          <button type="button" className={`mode-btn ${mode === 'otp' ? 'mode-active' : ''}`} onClick={() => setMode('otp')} disabled={loading}>
            OTP
          </button>
        </div>

        <div className="input-group">
          <label className="input-label">Email or phone</label>
          <div className="input-row">
            {mode === 'password' ? <MdEmail /> : <MdPhone />}
            <input
              className="input-field"
              name="identifier"
              placeholder={mode === 'password' ? 'patient@demo.com' : '+91 98765 43210'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type={mode === 'password' ? 'text' : 'tel'}
              autoComplete="username"
              autoCapitalize="none"
              disabled={loading}
            />
          </div>
        </div>

        {mode === 'password' && (
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-row">
              <MdLock />
              <input
                className="input-field"
                name="password"
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" className="visibility-btn" onClick={() => setShowPassword((p) => !p)} disabled={loading}>
                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>
        )}

        {error ? <div className="error-text">{error}</div> : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? <span className="spinner" /> : (mode === 'password' ? 'Sign In' : 'Send OTP')}
        </button>

        <div className="signup-row">
          <span className="muted-text">Need a new account?</span>
          <button type="button" className="link-btn" onClick={() => onNavigate('signup')} disabled={loading}>
            Register now
          </button>
        </div>
      </form>
    </div>
  )
}
