import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MdEventNote, MdHourglassTop, MdVerified, MdCheckCircle, MdAccessTime,
  MdWbSunny, MdEventAvailable, MdCalendarToday, MdWifiOff, MdSwipe,
  MdMedicalServices, MdPeople, MdKeyboardArrowDown, MdKeyboardArrowUp,
} from 'react-icons/md'
import { extractPatientDashboard, getAppointmentStatusLabel, getPatientDashboard } from '../api/dashboard'
import { normalizeImageUri, withImageCacheBuster } from '../config/env'
import { C } from '../config/theme'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatDate = (v) => {
  if (!v) return 'Not scheduled'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

const getHourGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const getInitials = (name = 'P') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'P'

const getServiceName = (s) => s.name || s.serviceName || s.ServiceName || 'Health Service'
const getStaffName = (s) => s.name || s.fullName || s.staffName || 'Care Specialist'
const getStaffImage = (s) => normalizeImageUri(s.image || s.profileImage || s.imageUrl || s.profileImageUrl || null)
const getStaffSpec = (s) => s.specialization || s.Specialization || s.role || 'Specialist'
const getServiceType = (s) => {
  const text = `${getServiceName(s)} ${s.category || s.categoryName || s.type || s.serviceType || ''}`.toLowerCase()
  return text.includes('full') ? 'full' : 'day'
}

const STATUS_META = {
  Pending: C.pending,
  Approved: C.approved,
  Confirmed: C.approved,
  Completed: C.completed,
  Cancelled: C.cancelled,
  Rejected: C.cancelled,
}

const getStatusMeta = (status) => {
  const label = getAppointmentStatusLabel(status)
  return { label, ...(STATUS_META[label] || C.pending) }
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ backgroundColor: `${color}18`, color }}>
        <Icon />
      </div>
      <div className="stat-value">{value ?? 0}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ── Section header ── */
function Section({ title, sub, children }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {sub ? <span className="section-sub">{sub}</span> : children}
    </div>
  )
}

/* ── Appointment card ── */
function ApptCard({ appt, label, accent }) {
  if (!appt) {
    return (
      <div className={`appt-card ${accent ? 'accent' : ''}`}>
        <div className="appt-icon-wrap"><MdEventAvailable /></div>
        <div className="appt-body">
          <div className="appt-label">{label}</div>
          <div className="appt-empty">No appointment scheduled</div>
        </div>
      </div>
    )
  }
  const meta = getStatusMeta(appt.status)
  return (
    <div className={`appt-card ${accent ? 'accent' : ''}`}>
      <div className="appt-icon-wrap" style={{ backgroundColor: `${meta.dot}18`, color: meta.dot }}>
        <MdEventNote />
      </div>
      <div className="appt-body">
        <div className="appt-row-header">
          <span className="appt-label">{label}</span>
          <span className="status-pill" style={{ backgroundColor: meta.bg, color: meta.text }}>
            <span className="dot" style={{ backgroundColor: meta.dot }} />
            {meta.label}
          </span>
        </div>
        <div className="appt-service">{appt.serviceName || appt.diseaseName || 'Booked Visit'}</div>
        <div className="appt-meta">
          <MdCalendarToday />
          <span className="appt-meta-text">{formatDate(appt.appointmentDate)}</span>
          {appt.slotTime ? (
            <>
              <span className="meta-dot" />
              <MdAccessTime />
              <span className="appt-meta-text">{appt.slotTime}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ── Main ── */
export default function HomeScreen({ user, onBookAppointment }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllRecent, setShowAllRecent] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDashboard(extractPatientDashboard(await getPatientDashboard()))
    } catch (e) {
      setError(e.message || 'Unable to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const summary = dashboard?.userSummary || {}
  const services = dashboard?.services || []
  const staffs = dashboard?.staffs || []
  const recentAppts = dashboard?.recentAppointments || []
  const upcoming = dashboard?.upcomingAppointment || null
  const lastAppt = dashboard?.lastAppointment || null

  const patientName = summary.name || user?.name || 'Patient'
  const firstName = patientName.split(' ')[0]
  const total = Number(summary.totalAppointments || 0)
  const completed = Number(summary.totalCompleted || 0)
  const pending = Number(summary.totalPending || 0)
  const approved = Number(summary.totalApproved || 0)
  const cancelled = Number(summary.totalCancelled || 0)
  const rate = useMemo(() => (!total ? 0 : Math.round((completed / total) * 100)), [total, completed])
  const avatarUri = withImageCacheBuster(user?.profileImage || summary.profileImage, user?.profileImageVersion)
  const openAppointment = (serviceType = 'day') => onBookAppointment?.(serviceType)

  if (loading && !dashboard) {
    return (
      <div className="page-content">
        <div className="loader-wrap">
          <span className="spinner dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <div className="loader-text">Loading your dashboard…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hero-greeting">{getHourGreeting()}, {firstName} 👋</div>
            <div className="hero-date">{formatDate(new Date().toISOString())}</div>
          </div>
          <div className="hero-avatar">
            {avatarUri
              ? <img src={avatarUri} alt={patientName} onError={(e) => { e.currentTarget.style.display = 'none' }} />
              : <div className="hero-avatar-fallback">{getInitials(patientName)}</div>}
          </div>
        </div>

        <div className="hero-strip">
          <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
            <div className="hero-kicker">PATIENT DASHBOARD</div>
            <div className="hero-title">{total} Total Visits</div>
            <div className="hero-sub">{pending} pending · {approved} approved · {cancelled} cancelled</div>
          </div>
          <div className="ring">
            <div className="ring-value">{rate}%</div>
            <div className="ring-label">done</div>
          </div>
        </div>

        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${rate}%` }} />
          </div>
          <div className="progress-label">{rate}% completion rate</div>
        </div>
      </div>

      {/* ── Error ── */}
      {error ? (
        <button type="button" className="error-box" onClick={load}>
          <MdWifiOff />
          <span className="error-box-text">{error} Tap to retry.</span>
        </button>
      ) : null}

      {/* ── Stats ── */}
      <div className="stats-row">
        <StatCard icon={MdEventNote} label="Total" value={total} color={C.primary} />
        <StatCard icon={MdHourglassTop} label="Pending" value={pending} color="#eab308" />
        <StatCard icon={MdVerified} label="Approved" value={approved} color="#3b82f6" />
        <StatCard icon={MdCheckCircle} label="Completed" value={completed} color={C.accent} />
      </div>

      {/* ── Quick Book ── */}
      <Section title="Book Appointment" sub="Choose your care type" />
      <div className="book-row">
        <button type="button" className="book-type-btn book-type-btn-full" onClick={() => openAppointment('full')}>
          <MdAccessTime size={22} />
          <span className="book-type-btn-text">Full Time</span>
          <span className="book-type-btn-sub">Multi-day care</span>
        </button>
        <button type="button" className="book-type-btn book-type-btn-day" onClick={() => openAppointment('day')}>
          <MdWbSunny size={22} />
          <span className="book-type-btn-text">Day Care</span>
          <span className="book-type-btn-sub">Single-day visit</span>
        </button>
      </div>

      {/* ── Appointments ── */}
      <Section title="Appointments" sub="Your schedule" />
      <ApptCard appt={upcoming} label="Upcoming" accent />
      <ApptCard appt={lastAppt} label="Last Visit" />

      {/* ── Recent ── */}
      {recentAppts.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">Recent Activity</span>
            <button type="button" className="see-all-btn" onClick={() => setShowAllRecent((v) => !v)}>
              <span>{showAllRecent ? 'Show less' : `See all ${recentAppts.length}`}</span>
              {showAllRecent ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
            </button>
          </div>
          {(showAllRecent ? recentAppts : recentAppts.slice(0, 3)).map((a, i) => (
            <ApptCard key={a.id || i} appt={a} label={`Visit #${a.id || i + 1}`} />
          ))}
        </>
      )}

      {/* ── Services ── */}
      <Section title="Our Services" sub={`${services.length} available`} />
      {services.length ? (
        <>
          <div className="h-list-hint">
            <MdSwipe />
            <span>Swipe to see more</span>
          </div>
          <div className="h-list">
            {services.map((s, i) => {
              const serviceImage = normalizeImageUri(s.image || s.serviceImage || s.imageUrl || s.iconUrl)
              return (
                <button key={s.id || i} type="button" className="service-card" onClick={() => openAppointment(getServiceType(s))}>
                  {serviceImage
                    ? <img src={serviceImage} alt={getServiceName(s)} className="service-card-img" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    : <div className="service-card-fallback"><MdMedicalServices /></div>}
                  <div className="service-card-name">{getServiceName(s)}</div>
                  <div className="service-card-cat">{s.category || s.categoryName || 'Care'}</div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="empty-row">
          <MdMedicalServices />
          <span className="empty-row-text">No services available right now.</span>
        </div>
      )}

      {/* ── Staff ── */}
      <Section title="Care Team" sub={`${staffs.length} specialists`} />
      {staffs.length ? (
        <>
          <div className="h-list-hint">
            <MdSwipe />
            <span>Swipe to see more</span>
          </div>
          <div className="h-list">
            {staffs.slice(0, 10).map((s, i) => (
              <div key={s.id || i} className="staff-card">
                {getStaffImage(s)
                  ? <img src={getStaffImage(s)} alt={getStaffName(s)} className="staff-card-img" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  : <div className="staff-card-avatar">{getInitials(getStaffName(s))}</div>}
                <div className="staff-online" />
                <div className="staff-card-name">{getStaffName(s)}</div>
                <div className="staff-card-spec">{getStaffSpec(s)}</div>
                <div className="staff-badge">
                  <span className="staff-badge-text">{s.experience || 0} yrs exp</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-row">
          <MdPeople />
          <span className="empty-row-text">No staff profiles available right now.</span>
        </div>
      )}

      <div style={{ height: 4 }} />
    </div>
  )
}
