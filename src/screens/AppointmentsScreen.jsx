import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MdRefresh, MdAdd, MdArrowBack, MdArrowForward, MdCalendarToday, MdAccessTime,
  MdEventBusy, MdWifiOff, MdSwipe, MdMedicalServices, MdSchedule, MdCheckCircle,
  MdAddPhotoAlternate, MdClose, MdMyLocation, MdMap, MdKeyboardArrowDown,
} from 'react-icons/md'
import { C } from '../config/theme'
import { normalizeImageUri } from '../config/env'
import {
  createPatientAppointment,
  extractAppointments,
  extractServices,
  getPatientAppointmentsByUser,
  getServices,
} from '../api/patient'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

const SERVICE_TYPES = [
  { id: 'full', title: 'Full Time Services', subtitle: 'Fulltime Service', icon: MdSchedule },
  { id: 'day', title: 'Day Care', subtitle: 'DayCare Service', icon: MdAccessTime },
]

const STATUS_STYLES = {
  Pending: { bg: '#fff3d6', text: '#9a6400', icon: '#f59e0b' },
  Approved: { bg: '#e7efff', text: '#214ab3', icon: '#1c35ff' },
  Confirmed: { bg: '#e7efff', text: '#214ab3', icon: '#1c35ff' },
  Completed: { bg: '#e5f8ee', text: '#247a49', icon: '#149688' },
  Cancelled: { bg: '#ffe6ea', text: '#b83246', icon: '#e84d5b' },
  Rejected: { bg: '#ffe6ea', text: '#b83246', icon: '#e84d5b' },
}

const normalizeStatusLabel = (status) => {
  if (status === 1) return 'Pending'
  if (status === 2) return 'Approved'
  if (status === 3) return 'Completed'
  if (status === 4) return 'Cancelled'
  const label = String(status || 'Pending').trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : 'Pending'
}

const getStatusStyle = (status) => {
  const label = normalizeStatusLabel(status)
  return { label, ...(STATUS_STYLES[label] || STATUS_STYLES.Pending) }
}

const formatDisplay = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return isoStr
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

const toHHMM = (value) => {
  if (!value) return ''
  const [h, m] = value.split(':')
  return `${pad(Number(h))}:${pad(Number(m))}`
}

const to12Hour = (value) => {
  if (!value) return ''
  const [hStr, m] = value.split(':')
  const h = Number(hStr)
  const h12 = h % 12 || 12
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${pad(h12)}:${m} ${ampm}`
}

const GEO_ERROR_MESSAGES = {
  1: 'Location permission denied. Please allow location access for this site in your browser settings, then try again.',
  2: 'Location unavailable. Turn on GPS / location services on your device and try again.',
  3: 'Location request timed out. Move to an open area or near a window, then try again.',
}

const getGeoErrorMessage = (err) =>
  GEO_ERROR_MESSAGES[err?.code] || 'Unable to get your current location. Please enter latitude/longitude manually.'

const TABS = ['Service Type', 'Services', 'Prescription & Comments', 'Location', 'Date & Time', 'Confirm']

export default function AppointmentsScreen({ user, onAppointmentCreated, initialServiceType, initialTab }) {
  const [view, setView] = useState(initialTab === 'form' && initialServiceType ? 'form' : 'list')
  const [formTab, setFormTab] = useState(0)
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [serviceType, setServiceType] = useState(initialServiceType || 'day')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [diseaseName, setDiseaseName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [noOfDays, setNoOfDays] = useState('1')
  const [doctorPrescriptionImage, setDoctorPrescriptionImage] = useState(null) // { file, previewUrl }
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [appointmentAddress, setAppointmentAddress] = useState('')

  const fileInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const startTimeRef = useRef(null)
  const endTimeRef = useRef(null)

  const loadAll = useCallback(async (silent = false) => {
    if (!user?.id) {
      setAppointments([])
      setApptLoading(false)
      setServicesLoading(false)
      setRefreshing(false)
      setError('Unable to load appointments for this user.')
      return
    }
    if (!silent) {
      setApptLoading(true)
      setServicesLoading(true)
    }
    setError('')
    try {
      const [apptPayload, svcPayload] = await Promise.all([getPatientAppointmentsByUser(user.id), getServices()])
      setAppointments(extractAppointments(apptPayload))
      setServices(extractServices(svcPayload))
    } catch (e) {
      setError(e.message || 'Unable to load data.')
    } finally {
      setApptLoading(false)
      setServicesLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (serviceType === 'day') {
      setNoOfDays('1')
    } else if (serviceType === 'full') {
      setNoOfDays((current) => (current === '1' ? '2' : current || '2'))
    }
  }, [serviceType])

  const handleRefresh = () => {
    setRefreshing(true)
    loadAll(true)
  }

  const pickImage = () => fileInputRef.current?.click()

  const onImageSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDoctorPrescriptionImage({ file, name: file.name, type: file.type, previewUrl: URL.createObjectURL(file) })
  }

  const removeImage = (e) => {
    e.stopPropagation()
    if (doctorPrescriptionImage?.previewUrl) URL.revokeObjectURL(doctorPrescriptionImage.previewUrl)
    setDoctorPrescriptionImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetForm = () => {
    setSelectedServiceId('')
    setDiseaseName('')
    setStartTime('')
    setEndTime('')
    setAppointmentDate('')
    setNoOfDays('1')
    setDoctorPrescriptionImage(null)
    setLatitude('')
    setLongitude('')
    setAppointmentAddress('')
    setError('')
    setFormTab(0)
  }

  const validateTimeRange = () => {
    if (!startTime || !endTime) {
      setError('Please select both start time and end time.')
      return false
    }
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) {
      setError('End time must be after start time.')
      return false
    }
    return true
  }

  const applyPosition = (position) => {
    const lat = position.coords.latitude.toFixed(6)
    const lng = position.coords.longitude.toFixed(6)
    setLatitude(lat)
    setLongitude(lng)
    setLocationLoading(false)
    // Best effort: convert coordinates into a readable address
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const label = data?.display_name
        if (label) {
          setAppointmentAddress((prev) => (!prev || prev.startsWith('Lat:') ? label : prev))
        } else {
          setAppointmentAddress((prev) => prev || `Lat: ${lat}, Lng: ${lng}`)
        }
      })
      .catch(() => {
        setAppointmentAddress((prev) => prev || `Lat: ${lat}, Lng: ${lng}`)
      })
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    if (window.isSecureContext === false) {
      setError('GPS needs a secure (HTTPS) page. Open the app using the https:// address shown in the terminal, or enter latitude/longitude manually.')
      return
    }
    setLocationLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => {
        // GPS timeout → retry once with network/Wi-Fi location (works better indoors)
        if (err?.code === 3) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            (err2) => {
              setError(getGeoErrorMessage(err2))
              setLocationLoading(false)
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
          )
          return
        }
        setError(getGeoErrorMessage(err))
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  const selectedService = services.find((s) => String(s.id || s.serviceId || s.ServiceId) === String(selectedServiceId))
  const selectedServiceLabel =
    selectedService?.serviceName || selectedService?.name || selectedService?.ServiceName ||
    (selectedServiceId ? `Service #${selectedServiceId}` : 'Select service')

  const slotTimeRange = startTime && endTime ? `${toHHMM(startTime)} - ${toHHMM(endTime)}` : ''

  const handleBook = async () => {
    setError('')
    if (!selectedServiceId || !appointmentDate) {
      setError('Please select a service and an appointment date.')
      return
    }
    if (!validateTimeRange()) return

    setLoading(true)
    try {
      await createPatientAppointment({
        userId: user?.id || 0,
        diseaseName: diseaseName.trim(),
        slotTime: slotTimeRange,
        appointmentDate,
        noOfDays: Number(noOfDays) || 0,
        serviceId: Number(selectedServiceId),
        dischargeDate: appointmentDate,
        doctorPrescription: '',
        doctorPrescriptionImage,
        latitude: latitude.trim(),
        longitude: longitude.trim(),
        appointmentAddress: appointmentAddress.trim(),
        staffId: 0,
      })
      onAppointmentCreated?.()
      resetForm()
      setView('list')
      loadAll(true)
    } catch (e) {
      setError(e.message || 'Unable to book appointment.')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    setError('')
    if (formTab === 0) {
      if (!serviceType) { setError('Please select a care type.'); return }
      setFormTab(1); return
    }
    if (formTab === 1) {
      if (!selectedServiceId) { setError('Please select a service.'); return }
      setFormTab(2); return
    }
    if (formTab === 2) { setFormTab(3); return }
    if (formTab === 3) { setFormTab(4); return }
    if (formTab === 4) {
      if (!appointmentDate) { setError('Please select an appointment date.'); return }
      if (!validateTimeRange()) return
      setFormTab(5); return
    }
  }

  /* ══════════ LIST VIEW ══════════ */
  if (view === 'list') {
    const total = appointments.length
    const pending = appointments.filter((a) => normalizeStatusLabel(a.status) === 'Pending').length
    const approved = appointments.filter((a) => ['Approved', 'Confirmed'].includes(normalizeStatusLabel(a.status))).length
    const completed = appointments.filter((a) => normalizeStatusLabel(a.status) === 'Completed').length

    const pills = [
      { label: 'Total', count: total, bg: C.primaryLight, color: C.primary },
      { label: 'Pending', count: pending, bg: '#fff3d6', color: '#9a6400' },
      { label: 'Approved', count: approved, bg: '#e7efff', color: '#214ab3' },
      { label: 'Done', count: completed, bg: '#e5f8ee', color: '#247a49' },
    ]

    return (
      <div className="page-content">
        <div className="list-header">
          <span className="list-header-title">My Appointments</span>
          <div className="header-actions">
            <button type="button" className="icon-btn" onClick={handleRefresh} disabled={refreshing || apptLoading}>
              {refreshing ? <span className="spinner small" /> : <MdRefresh />}
            </button>
            <button type="button" className="book-btn" onClick={() => setView('form')}>
              <MdAdd />
              <span>Book</span>
            </button>
          </div>
        </div>

        <div className="summary-pills">
          {pills.map((p) => (
            <div key={p.label} className="pill-box" style={{ backgroundColor: p.bg }}>
              <div className="pill-count" style={{ color: p.color }}>{p.count}</div>
              <div className="pill-label" style={{ color: p.color }}>{p.label}</div>
            </div>
          ))}
        </div>

        {apptLoading ? (
          <div className="loader-wrap"><span className="spinner dark" /></div>
        ) : appointments.length ? (
          appointments.map((item, idx) => {
            const s = getStatusStyle(item.status)
            return (
              <div key={item.id} className={`appt-row ${idx % 2 !== 0 ? 'alt' : ''}`}>
                <div className="appt-row-left">
                  <span className="appt-idx">{idx + 1}</span>
                  <span className="appt-dot" style={{ backgroundColor: s.icon }} />
                </div>
                <div className="appt-row-center">
                  <div className="appt-row-service">{item.type}</div>
                  <div className="appt-row-meta">
                    <MdCalendarToday />
                    <span className="appt-row-meta-text">{item.date}</span>
                    <span className="appt-row-meta-sep" />
                    <MdAccessTime />
                    <span className="appt-row-meta-text">{item.time || '-'}</span>
                  </div>
                </div>
                <div className="appt-badge" style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</div>
              </div>
            )
          })
        ) : (
          <div className="empty-appt-card">
            <MdEventBusy size={40} />
            <div className="empty-appt-title">No appointments yet</div>
            <div className="empty-appt-hint">Tap "Book" to schedule your first visit.</div>
          </div>
        )}
      </div>
    )
  }

  /* ══════════ FORM VIEW ══════════ */
  const renderStepContent = () => {
    if (formTab === 0) {
      return (
        <>
          <div className="form-heading">Select your care service</div>
          <div className="form-hint">Choose the type of care service that best fits your needs.</div>
          <div className="service-type-row">
            {SERVICE_TYPES.map((type) => {
              const active = serviceType === type.id
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`service-type-card ${active ? 'active' : ''}`}
                  onClick={() => { setServiceType(type.id); setError('') }}
                  disabled={loading}
                >
                  <div className="service-type-icon"><Icon /></div>
                  <div className="service-type-title">{type.title}</div>
                  <div className="service-type-subtitle">{type.subtitle}</div>
                </button>
              )
            })}
          </div>
        </>
      )
    }

    if (formTab === 1) {
      return (
        <>
          <div className="form-heading">Choose a service</div>
          <div className="form-hint">Tap a card to select the service you need.</div>
          <div className="h-list-hint">
            <MdSwipe />
            <span>Swipe to see more</span>
          </div>
          {servicesLoading ? (
            <div className="loader-wrap" style={{ minHeight: '20vh' }}><span className="spinner dark" /></div>
          ) : services.length ? (
            <div className="service-card-list">
              {services.map((s) => {
                const sid = String(s.id || s.serviceId || s.ServiceId)
                const title = s.serviceName || s.name || s.ServiceName || `Service #${sid}`
                const category = s.category || s.categoryName || s.type || 'Care'
                const selected = String(selectedServiceId) === sid
                const svcImage = normalizeImageUri(s.image || s.serviceImage || s.imageUrl || s.iconUrl)
                return (
                  <button
                    key={sid}
                    type="button"
                    className={`service-card-item ${selected ? 'active' : ''}`}
                    onClick={() => setSelectedServiceId(sid)}
                    disabled={loading}
                  >
                    {svcImage
                      ? <img src={svcImage} alt={title} className="service-card-item-img" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      : <div className="service-card-item-fallback"><MdMedicalServices /></div>}
                    <div className="service-card-item-title">{title}</div>
                    <div className="service-card-item-cat">{category}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="empty-row">
              <MdMedicalServices />
              <span className="empty-row-text">No services available.</span>
            </div>
          )}
        </>
      )
    }

    if (formTab === 2) {
      return (
        <>
          <div className="form-heading">Prescription & Comments</div>
          <div className="form-hint">Upload your prescription image and add any comments.</div>
          <div className="input-group">
            <label className="input-label">Prescription Image (optional)</label>
            <button type="button" className="image-picker" onClick={pickImage} disabled={loading}>
              {doctorPrescriptionImage ? (
                <img src={doctorPrescriptionImage.previewUrl} alt="Prescription" />
              ) : (
                <div className="image-picker-placeholder">
                  <MdAddPhotoAlternate />
                  <span className="image-picker-placeholder-text">Tap to upload prescription</span>
                </div>
              )}
            </button>
            {doctorPrescriptionImage && (
              <button type="button" className="remove-img-btn" onClick={removeImage}>
                <MdClose />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageSelected} />
          </div>
          <div className="input-group">
            <label className="input-label">Comments (optional)</label>
            <textarea
              className="multiline-input"
              placeholder="Add any comments or care notes…"
              value={diseaseName}
              onChange={(e) => setDiseaseName(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </>
      )
    }

    if (formTab === 3) {
      return (
        <>
          <div className="form-heading">Pick location</div>
          <div className="form-hint">Set your appointment location.</div>
          <div className="input-group">
            <button type="button" className="location-btn" onClick={handleUseCurrentLocation} disabled={loading || locationLoading}>
              {locationLoading ? <span className="spinner small" /> : <><MdMyLocation /><span>Use My Current Location</span></>}
            </button>
          </div>
          <div className="location-coord-row">
            <div className="location-coord-field">
              <label className="input-label">Latitude</label>
              <input className="number-input" placeholder="28.6139" value={latitude} onChange={(e) => setLatitude(e.target.value)} disabled={loading} inputMode="decimal" />
            </div>
            <div className="location-coord-field">
              <label className="input-label">Longitude</label>
              <input className="number-input" placeholder="77.2090" value={longitude} onChange={(e) => setLongitude(e.target.value)} disabled={loading} inputMode="decimal" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Appointment Address</label>
            <textarea
              className="multiline-input"
              placeholder="Auto-filled from coordinates"
              value={appointmentAddress}
              onChange={(e) => setAppointmentAddress(e.target.value)}
              disabled={loading}
              rows={2}
              style={{ minHeight: 60 }}
            />
            <span className="address-hint">Address is auto-filled from latitude/longitude.</span>
          </div>
          <div className="map-placeholder">
            <MdMap />
            <span className="map-placeholder-text">Map will show selected location</span>
            {latitude && longitude && <span className="map-coords">{latitude}, {longitude}</span>}
          </div>
        </>
      )
    }

    if (formTab === 4) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
      return (
        <>
          <div className="form-heading">Date & Time</div>
          <div className="form-hint">Choose your appointment date, start and end time.</div>
          <div className="day-mode">
            <button type="button" className={`day-mode-btn ${serviceType === 'day' ? 'active' : ''}`} disabled>Single Day</button>
            <button type="button" className={`day-mode-btn ${serviceType === 'full' ? 'active' : ''}`} disabled>Multiple Days</button>
          </div>

          <div className="input-group">
            <label className="input-label">Appointment Date *</label>
            <button type="button" className="picker-btn" onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()} disabled={loading}>
              <MdCalendarToday />
              <span className={`picker-btn-text ${!appointmentDate ? 'placeholder' : ''}`}>
                {appointmentDate ? formatDisplay(appointmentDate) : 'Select date'}
              </span>
              <MdKeyboardArrowDown />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              min={todayStr}
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Start Time *</label>
            <button type="button" className="picker-btn" onClick={() => startTimeRef.current?.showPicker?.() || startTimeRef.current?.focus()} disabled={loading}>
              <MdAccessTime />
              <span className={`picker-btn-text ${!startTime ? 'placeholder' : ''}`}>
                {startTime ? to12Hour(startTime) : 'Select time'}
              </span>
              <MdKeyboardArrowDown />
            </button>
            <input
              ref={startTimeRef}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
          </div>

          <div className="input-group">
            <label className="input-label">End Time *</label>
            <button type="button" className="picker-btn" onClick={() => endTimeRef.current?.showPicker?.() || endTimeRef.current?.focus()} disabled={loading}>
              <MdAccessTime />
              <span className={`picker-btn-text ${!endTime ? 'placeholder' : ''}`}>
                {endTime ? to12Hour(endTime) : 'Select time'}
              </span>
              <MdKeyboardArrowDown />
            </button>
            <input
              ref={endTimeRef}
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
          </div>

          {startTime && endTime && (
            <div className="range-summary">
              <MdSchedule />
              <span className="range-summary-text">{slotTimeRange}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">{serviceType === 'day' ? 'No. of Days (Day Care = 1)' : 'No. of Days'}</label>
            <input
              className="number-input"
              type="number"
              min="1"
              placeholder="1"
              value={noOfDays}
              onChange={(e) => setNoOfDays(e.target.value)}
              disabled={loading || serviceType === 'day'}
            />
          </div>
        </>
      )
    }

    return (
      <>
        <div className="form-heading">Confirm booking</div>
        <div className="form-hint">Review your details and submit.</div>
        <div className="summary-card">
          <div className="summary-label">Service Type</div>
          <div className="summary-value">{serviceType === 'full' ? 'Full Time Services' : 'Day Care'}</div>
          <div className="summary-label">Service</div>
          <div className="summary-value">{selectedServiceLabel}</div>
          <div className="summary-label">Comments</div>
          <div className="summary-value">{diseaseName || '-'}</div>
          <div className="summary-label">Appointment Address</div>
          <div className="summary-value">{appointmentAddress || '-'}</div>
          <div className="summary-label">Date</div>
          <div className="summary-value">{appointmentDate ? formatDisplay(appointmentDate) : '-'}</div>
          <div className="summary-label">Time</div>
          <div className="summary-value">{slotTimeRange || '-'}</div>
          <div className="summary-label">No. of Days</div>
          <div className="summary-value">{noOfDays || '-'}</div>
        </div>
      </>
    )
  }

  return (
    <div className="page-content">
      <div className="form-header">
        <button type="button" className="form-back-btn" onClick={() => { resetForm(); setView('list') }}>
          <MdArrowBack />
        </button>
        <div className="form-header-text">
          <div className="form-header-title">Book Appointment</div>
          <div className="form-header-sub">{TABS[formTab] ? `Step ${formTab + 1}: ${TABS[formTab]}` : 'Book your appointment'}</div>
        </div>
      </div>

      <div className="form-tab-bar">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`form-tab-item ${formTab === i ? 'active' : ''}`}
            onClick={() => { setError(''); setFormTab(i) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="progress-block">
        <div className="progress-block-label">Step {formTab + 1} of {TABS.length}</div>
        <div className="progress-track-segments">
          {TABS.map((label, index) => (
            <div key={label} className={`progress-segment ${index <= formTab ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      <div className="form-card">
        {renderStepContent()}

        {error ? <div className="error-text">{error}</div> : null}

        <div className="action-row">
          <button
            type="button"
            className="secondary-btn"
            disabled={loading || formTab === 0}
            onClick={() => { setError(''); setFormTab((t) => Math.max(0, t - 1)) }}
          >
            <MdArrowBack />
            <span>Back</span>
          </button>

          {formTab < TABS.length - 1 ? (
            <button type="button" className="submit-btn" disabled={loading} onClick={handleNext}>
              <span>Next</span>
              <MdArrowForward />
            </button>
          ) : (
            <button type="button" className="submit-btn" disabled={loading || servicesLoading} onClick={handleBook}>
              {loading ? <span className="spinner" /> : (<><MdCheckCircle /><span>Confirm Booking</span></>)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
