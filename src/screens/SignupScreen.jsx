import { useRef, useState } from 'react'
import {
  MdPerson, MdEmail, MdPhone, MdLock, MdVisibility, MdVisibilityOff,
  MdAddAPhoto, MdKeyboardArrowDown, MdKeyboardArrowUp, MdArrowForward,
  MdOutlinePersonOutline, MdPinDrop,
} from 'react-icons/md'

const ALLOWED_PIN_CODES = new Set(['110014', '110003', '110048', '110019', '110065', '110017', '110049', '110029', '110024'])
const GENDER_OPTIONS = ['Male', 'Female', 'Other']

function Field({ icon: Icon, placeholder, value, onChange, type = 'text', name, autoComplete, inputMode, maxLength, disabled, right }) {
  return (
    <div className="input-row">
      <Icon />
      <input
        className="input-field"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
      />
      {right}
    </div>
  )
}

export default function SignupScreen({ onRegister, onNavigate }) {
  const fileInputRef = useRef(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [genderMenuOpen, setGenderMenuOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [pincode, setPincode] = useState('')
  const [profileImage, setProfileImage] = useState(null) // { file, previewUrl }
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const showEmail = Boolean(fullName.trim())
  const showPhone = showEmail && Boolean(email.trim())
  const showGender = showPhone && Boolean(phone.trim())
  const showPinCode = showGender && Boolean(gender)
  const showPasswordField = showPinCode && Boolean(pincode.trim())
  const canContinue = showPasswordField && Boolean(password.trim())

  const pickProfileImage = () => fileInputRef.current?.click()

  const onImageSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfileImage({ file, name: file.name, type: file.type, previewUrl: URL.createObjectURL(file) })
    setError('')
  }

  const removeImage = () => {
    if (profileImage?.previewUrl) URL.revokeObjectURL(profileImage.previewUrl)
    setProfileImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validatePinCode = () => {
    const normalized = pincode.trim()
    if (!/^\d{6}$/.test(normalized)) {
      setError('Please enter a valid 6-digit pin code.')
      return false
    }
    if (!ALLOWED_PIN_CODES.has(normalized)) {
      setError('Service is not available in this area.')
      return false
    }
    return true
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleRegister()
  }

  const handleRegister = async () => {
    setError('')
    if (!fullName.trim() || !email.trim() || !phone.trim() || !gender || !pincode.trim() || !password.trim()) {
      setError('Please fill all required fields.')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number.')
      return
    }
    if (!validatePinCode()) return

    setLoading(true)
    const result = await onRegister({
      name: fullName.trim(),
      email: email.trim(),
      phoneNumber: phone.trim(),
      gender,
      pinCode: pincode.trim(),
      password,
      address: '',
      houseNumber: '',
      landmark: '',
      role: 'patient',
      userProfileImageUrl: profileImage,
    })
    setLoading(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="auth-screen">
      <form className="card" onSubmit={handleFormSubmit} noValidate>
        <h1 className="card-title">Create Account</h1>
        <p className="card-subtitle">Fill in your details to get started.</p>

        <div className="tab-bar">
          <div className="tab-item tab-active">
            <div className="tab-dot tab-dot-active">1</div>
            <span className="tab-label tab-label-active">Personal Info</span>
          </div>
        </div>

        <div className="profile-picker-wrap">
          <button type="button" className="profile-picker" onClick={pickProfileImage} disabled={loading}>
            {profileImage ? (
              <img src={profileImage.previewUrl} alt="Profile" />
            ) : (
              <span className="profile-placeholder"><MdAddAPhoto /></span>
            )}
          </button>
          <div className="profile-picker-copy">
            <span className="input-label">Profile Image</span>
            <span className="helper-text">Upload patient photo for profile.</span>
            {profileImage && (
              <button type="button" className="remove-image-text" onClick={removeImage} disabled={loading}>
                Remove image
              </button>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageSelected} />

        <div className="input-group">
          <label className="input-label">Full Name *</label>
          <Field icon={MdPerson} name="name" autoComplete="name" placeholder="Enter full name" value={fullName} onChange={setFullName} disabled={loading} />
        </div>

        {showEmail && (
          <div className="input-group">
            <label className="input-label">Email *</label>
            <Field icon={MdEmail} name="email" autoComplete="email" placeholder="patient@demo.com" value={email} onChange={setEmail} type="email" disabled={loading} />
          </div>
        )}

        {showPhone && (
          <div className="input-group">
            <label className="input-label">Phone *</label>
            <Field icon={MdPhone} name="phone" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={setPhone} type="tel" disabled={loading} />
          </div>
        )}

        {showGender && (
          <div className="input-group">
            <label className="input-label">Gender *</label>
            <div className="dropdown-wrapper">
              <button type="button" className="dropdown-btn" onClick={() => setGenderMenuOpen((c) => !c)} disabled={loading}>
                <MdOutlinePersonOutline />
                <span className={`dropdown-text ${!gender ? 'placeholder' : ''}`}>{gender || 'Select gender'}</span>
                {genderMenuOpen ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
              </button>
              {genderMenuOpen && (
                <div className="dropdown-menu">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`dropdown-item ${gender === option ? 'selected' : ''}`}
                      onClick={() => { setGender(option); setGenderMenuOpen(false); setError('') }}
                      disabled={loading}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showPinCode && (
          <div className="input-group">
            <label className="input-label">Pin Code *</label>
            <Field
              icon={MdPinDrop}
              name="pincode"
              autoComplete="postal-code"
              placeholder="6-digit pin code"
              value={pincode}
              onChange={(v) => { setPincode(v.replace(/\D/g, '').slice(0, 6)); setError('') }}
              inputMode="numeric"
              maxLength={6}
              disabled={loading}
            />
            <span className="helper-text">Allowed pin codes: 110014, 110003, 110048, 110019, 110065, 110017, 110049, 110029, 110024.</span>
          </div>
        )}

        {showPasswordField && (
          <div className="input-group">
            <label className="input-label">Password *</label>
            <Field
              icon={MdLock}
              name="password"
              autoComplete="new-password"
              placeholder="Create password"
              value={password}
              onChange={setPassword}
              type={passwordVisible ? 'text' : 'password'}
              disabled={loading}
              right={
                <button type="button" className="visibility-btn" onClick={() => setPasswordVisible((p) => !p)}>
                  {passwordVisible ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              }
            />
          </div>
        )}

        {error ? <div className="error-text">{error}</div> : null}

        <button type="submit" className="primary-btn" disabled={!canContinue || loading}>
          {loading ? <span className="spinner" /> : (<><span>Register</span><MdArrowForward /></>)}
        </button>

        <div className="login-row">
          <span className="muted-text">Already registered?</span>
          <button type="button" className="link-btn" onClick={() => onNavigate('login')} disabled={loading}>
            Sign in
          </button>
        </div>
      </form>
    </div>
  )
}
