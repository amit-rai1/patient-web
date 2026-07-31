import { useState } from 'react'
import { MdSecurity } from 'react-icons/md'

export default function OtpScreen({ authType, contact, onVerifyOtp, onResendOtp, onNavigate }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const info = `OTP sent to ${contact}. Please enter the code to continue.`

  const handleVerify = async () => {
    setError('')
    if (!code.trim()) {
      setError('Please enter the OTP code.')
      return
    }
    setLoading(true)
    const result = await onVerifyOtp(code.trim())
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.redirect === 'login') {
      onNavigate('login')
    }
  }

  const handleResend = async () => {
    setError('')
    setResending(true)
    const result = await onResendOtp()
    setResending(false)
    if (!result.ok) setError(result.error)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify()
  }

  return (
    <div className="auth-screen">
      <div className="card">
        <h1 className="card-title">{authType === 'signup' ? 'Verify registration' : 'Verify login'}</h1>
        <p className="card-subtitle">
          {authType === 'signup'
            ? 'We sent a temporary code to your registered phone number. Enter it below to finish registration.'
            : 'We sent a temporary code to your phone number. Enter it below to continue.'}
        </p>

        <div className="input-group">
          <label className="input-label">One-time password</label>
          <div className="input-row">
            <MdSecurity />
            <input
              className="input-field"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              disabled={loading || resending}
            />
          </div>
        </div>

        <div className="info-card">
          <p className="info-text">{info}</p>
        </div>

        {error ? <div className="error-text" style={{ marginTop: 10 }}>{error}</div> : null}

        <button type="button" className="primary-btn" onClick={handleVerify} disabled={loading || resending}>
          {loading ? <span className="spinner" /> : 'Verify OTP'}
        </button>

        <button type="button" className="resend-btn" onClick={handleResend} disabled={loading || resending}>
          {resending ? <span className="spinner small dark" /> : 'Resend OTP'}
        </button>

        <div className="login-row">
          <span className="muted-text">Change method?</span>
          <button type="button" className="link-btn" onClick={() => onNavigate('login')} disabled={loading || resending}>
            Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
