import { apiRequest } from './http'

export async function getPatientDashboard() {
  return apiRequest('/patient-dashboard', { method: 'GET' })
}

export function extractPatientDashboard(payload) {
  const source = payload?.data || payload?.result || payload || {}
  return {
    userSummary: source.userSummary || source.UserSummary || source.summary || source.Summary || {},
    services: source.services || source.Services || [],
    staffs: source.staffs || source.Staffs || source.staff || source.Staff || [],
    recentAppointments: source.recentAppointments || source.RecentAppointments || source.recent || [],
    upcomingAppointment: source.upcomingAppointment || source.UpcomingAppointment || source.upcoming || null,
    lastAppointment: source.lastAppointment || source.LastAppointment || source.lastVisit || null,
  }
}

export function getAppointmentStatusLabel(status) {
  if (status === 1) return 'Pending'
  if (status === 2) return 'Approved'
  if (status === 3) return 'Completed'
  if (status === 4) return 'Cancelled'
  const label = String(status || 'Pending').trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : 'Pending'
}
