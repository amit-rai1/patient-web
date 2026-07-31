import { MdArrowBack, MdEventAvailable, MdPeople, MdSecurity } from 'react-icons/md'

export default function AboutScreen({ onBack }) {
  return (
    <div className="auth-screen">
      <div className="card">
        <button type="button" className="about-btn" onClick={onBack} style={{ marginBottom: 20 }}>
          <span className="about-icon"><MdArrowBack /></span>
          <span className="about-copy">
            <span className="about-title">Back to login</span>
          </span>
        </button>

        <h1 className="card-title" style={{ marginBottom: 12 }}>About Home Care Nursing</h1>
        <p className="card-subtitle" style={{ lineHeight: 1.7 }}>
          Home Care Nursing Services provides professional healthcare at your doorstep.
          We connect patients with qualified nurses and care specialists for home visits,
          post-operative care, elderly care, and chronic disease management.
        </p>

        <div>
          <div className="about-feature">
            <span className="about-feature-icon"><MdEventAvailable /></span>
            <span className="about-feature-title">Easy Booking</span>
          </div>
          <p className="about-feature-desc">Schedule appointments with just a few taps. Choose full-time or day-care services.</p>

          <div className="about-feature">
            <span className="about-feature-icon"><MdPeople /></span>
            <span className="about-feature-title">Qualified Staff</span>
          </div>
          <p className="about-feature-desc">All our nurses are certified professionals with years of experience.</p>

          <div className="about-feature">
            <span className="about-feature-icon"><MdSecurity /></span>
            <span className="about-feature-title">Safe & Secure</span>
          </div>
          <p className="about-feature-desc">Your health data is protected with industry-standard security measures.</p>
        </div>
      </div>
    </div>
  )
}
