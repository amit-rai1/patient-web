import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MdEdit, MdLogout, MdContactPhone, MdPhone, MdEmail, MdLocationOn, MdPinDrop,
  MdArrowBack, MdPhotoCamera, MdPerson, MdHome, MdPlace, MdCheck,
  MdErrorOutline, MdKeyboardArrowDown, MdKeyboardArrowUp,
  MdRadioButtonChecked, MdRadioButtonUnchecked, MdOutlinePersonOutline,
} from 'react-icons/md'
import { updateUserProfile, extractUser } from '../api/auth'
import { normalizeImageUri, withImageCacheBuster } from '../config/env'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

const getInitials = (name = 'P') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'P'

const display = (v, fallback = 'Not provided') => (v === 0 ? '0' : v ? String(v) : fallback)

/* ── Read-only detail row ── */
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="detail-row">
      <div className="detail-icon"><Icon /></div>
      <div className="detail-copy">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{display(value)}</div>
      </div>
    </div>
  )
}

/* ── Edit field ── */
function EditField({ icon: Icon, label, value, onChange, type = 'text', placeholder, inputMode, maxLength }) {
  return (
    <div className="edit-group">
      <label className="edit-label">{label}</label>
      <div className="edit-row">
        <Icon />
        <input
          className="edit-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
        />
      </div>
    </div>
  )
}

export default function ProfileScreen({ user, onLogout, onProfileUpdated }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit'
  const [loggingOut, setLoggingOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [genderOpen, setGenderOpen] = useState(false)

  const fileInputRef = useRef(null)

  /* edit form state — pre-filled from user */
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [address, setAddress] = useState(user.address || '')
  const [houseNumber, setHouseNumber] = useState(user.houseNumber || '')
  const [landmark, setLandmark] = useState(user.landmark || '')
  const [pinCode, setPinCode] = useState(user.pinCode || user.pincode || '')
  const [gender, setGender] = useState(user.gender || '')
  const [profileImage, setProfileImage] = useState(null) // { file, previewUrl }

  const viewedProfileImage = withImageCacheBuster(user.profileImage, user.profileImageVersion)

  const addressDisplay = useMemo(
    () => [user.houseNumber, user.address, user.landmark, user.city].filter(Boolean).join(', '),
    [user.address, user.city, user.houseNumber, user.landmark]
  )

  const resetEditFields = () => {
    setName(user.name || '')
    setEmail(user.email || '')
    setPhone(user.phone || '')
    setAddress(user.address || '')
    setHouseNumber(user.houseNumber || '')
    setLandmark(user.landmark || '')
    setPinCode(user.pinCode || user.pincode || '')
    setGender(user.gender || '')
  }

  useEffect(() => {
    if (mode === 'view') resetEditFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user])

  const handleLogout = async () => {
    setLoggingOut(true)
    await new Promise((r) => setTimeout(r, 250))
    onLogout()
    setLoggingOut(false)
  }

  const pickImage = () => fileInputRef.current?.click()

  const onImageSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfileImage({ file, name: file.name, type: file.type, previewUrl: URL.createObjectURL(file) })
  }

  const removeNewImage = () => {
    if (profileImage?.previewUrl) URL.revokeObjectURL(profileImage.previewUrl)
    setProfileImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    setSaveError('')
    if (!name.trim()) { setSaveError('Name is required.'); return }
    setSaving(true)
    try {
      const response = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        houseNumber: houseNumber.trim(),
        landmark: landmark.trim(),
        pinCode: pinCode.trim(),
        gender,
        userProfileImageUrl: profileImage,
        isActive: true,
      })

      const updatedUserFromApi = extractUser(response) || {}
      const nextProfileImage =
        profileImage?.previewUrl ||
        normalizeImageUri(updatedUserFromApi.profileImage || updatedUserFromApi.userProfileImageUrl || updatedUserFromApi.userProfileImage) ||
        user.profileImage
      const nextProfileImageVersion = profileImage ? Date.now() : user.profileImageVersion

      onProfileUpdated?.({
        name: updatedUserFromApi.fullName || updatedUserFromApi.name || name.trim(),
        email: updatedUserFromApi.email || email.trim(),
        phone: updatedUserFromApi.phone || updatedUserFromApi.phoneNumber || phone.trim(),
        address: updatedUserFromApi.address || address.trim(),
        houseNumber: updatedUserFromApi.houseNumber || houseNumber.trim(),
        landmark: updatedUserFromApi.landmark || landmark.trim(),
        gender: updatedUserFromApi.gender || gender,
        pinCode: updatedUserFromApi.pinCode || updatedUserFromApi.pincode || pinCode.trim(),
        profileImage: nextProfileImage,
        profileImageVersion: nextProfileImageVersion,
        isActive: updatedUserFromApi.isActive !== undefined ? updatedUserFromApi.isActive : true,
      })
      setProfileImage(null)
      setMode('view')
    } catch (e) {
      setSaveError(e.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    resetEditFields()
    setProfileImage(null)
    setSaveError('')
    setGenderOpen(false)
    setMode('view')
  }

  /* ── VIEW MODE ── */
  if (mode === 'view') {
    return (
      <div className="page-content">
        {/* Banner */}
        <div className="profile-banner">
          <div className="profile-banner-top">
            <div className="profile-avatar">
              {viewedProfileImage
                ? <img src={viewedProfileImage} alt={user.name} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                : <span className="profile-avatar-text">{getInitials(user.name)}</span>}
            </div>
            <div className="profile-banner-info">
              <div className="profile-banner-name">{display(user.name, 'Patient')}</div>
              <div className="profile-banner-phone">{display(user.phone, 'Phone not added')}</div>
              <div className="profile-active-pill">
                <div className="profile-active-dot" />
                <span className="profile-active-text">Active Patient</span>
              </div>
            </div>
            <button type="button" className="profile-edit-btn" onClick={() => setMode('edit')}>
              <MdEdit />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Contact */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon"><MdContactPhone /></div>
            <span className="profile-card-title">Contact Information</span>
          </div>
          <DetailRow icon={MdPhone} label="Phone Number" value={user.phone} />
          <DetailRow icon={MdEmail} label="Email Address" value={user.email} />
          <DetailRow icon={MdLocationOn} label="Full Address" value={addressDisplay} />
          <DetailRow icon={MdPinDrop} label="Pin Code" value={user.pinCode || user.pincode} />
        </div>

        {/* Logout */}
        <button type="button" className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut
            ? <span className="spinner small" />
            : <><MdLogout /><span>Sign Out</span></>}
        </button>

        <div className="version-text">HealthCare Patient App · v1.0</div>
      </div>
    )
  }

  /* ── EDIT MODE ── */
  const editAvatarImage = profileImage?.previewUrl || viewedProfileImage

  return (
    <div className="page-content">
      {/* Edit header */}
      <div className="edit-header">
        <button type="button" className="edit-header-back" onClick={cancelEdit}>
          <MdArrowBack />
        </button>
        <div className="edit-header-text">
          <div className="edit-header-title">Edit Profile</div>
          <div className="edit-header-sub">Update your personal information</div>
        </div>
      </div>

      {/* Avatar picker */}
      <div className="avatar-picker-card">
        <button type="button" className="avatar-picker-wrap" onClick={pickImage}>
          {editAvatarImage
            ? <img src={editAvatarImage} alt="Profile" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            : <div className="avatar-picker-fallback">{getInitials(name || user.name)}</div>}
          <div className="avatar-picker-badge"><MdPhotoCamera /></div>
        </button>
        <div className="avatar-picker-info">
          <div className="avatar-picker-title">Profile Photo</div>
          <div className="avatar-picker-hint">Tap the photo to upload a new image</div>
          {profileImage && (
            <button type="button" className="remove-photo-text" onClick={removeNewImage}>
              Remove new photo
            </button>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageSelected} />

      {/* Form card */}
      <div className="edit-form-card">
        <div className="edit-form-section">Personal Info</div>
        <EditField icon={MdPerson} label="Full Name *" value={name} onChange={setName} placeholder="Enter full name" />
        <EditField icon={MdEmail} label="Email" value={email} onChange={setEmail} type="email" placeholder="patient@demo.com" />
        <EditField icon={MdPhone} label="Phone Number" value={phone} onChange={setPhone} type="tel" placeholder="+91 98765 43210" />

        {/* Gender dropdown */}
        <div className="edit-group">
          <label className="edit-label">Gender</label>
          <button type="button" className="edit-row" onClick={() => setGenderOpen((p) => !p)}>
            <MdOutlinePersonOutline />
            <span className="edit-input" style={{ color: gender ? 'inherit' : 'var(--text-muted)' }}>{gender || 'Select gender'}</span>
            {genderOpen ? <MdKeyboardArrowUp style={{ color: 'var(--text-muted)' }} /> : <MdKeyboardArrowDown style={{ color: 'var(--text-muted)' }} />}
          </button>
          {genderOpen && (
            <div className="gender-menu">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`gender-item ${gender === opt ? 'selected' : ''}`}
                  onClick={() => { setGender(opt); setGenderOpen(false) }}
                >
                  {gender === opt
                    ? <MdRadioButtonChecked className="checked" />
                    : <MdRadioButtonUnchecked className="unchecked" />}
                  <span className="gender-item-text">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="edit-form-section" style={{ marginTop: 8 }}>Address</div>
        <EditField icon={MdLocationOn} label="Address" value={address} onChange={setAddress} placeholder="Enter full address" />
        <EditField icon={MdHome} label="House Number" value={houseNumber} onChange={setHouseNumber} placeholder="Flat / house number" />
        <EditField icon={MdPlace} label="Landmark" value={landmark} onChange={setLandmark} placeholder="Nearby landmark" />
        <EditField
          icon={MdPinDrop}
          label="Pin Code"
          value={pinCode}
          onChange={(v) => setPinCode(v.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit pin code"
        />

        {saveError ? (
          <div className="edit-error-box">
            <MdErrorOutline />
            <span>{saveError}</span>
          </div>
        ) : null}

        <div className="edit-action-row">
          <button type="button" className="cancel-btn" onClick={cancelEdit} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
            {saving
              ? <span className="spinner small" />
              : <><MdCheck /><span>Save Changes</span></>}
          </button>
        </div>
      </div>

      <div className="version-text">HealthCare Patient App · v1.0</div>
    </div>
  )
}
