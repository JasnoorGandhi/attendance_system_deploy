const BASE = 'http://localhost:8000'

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken  = ()        => sessionStorage.getItem('token')
export const setToken  = (t)       => sessionStorage.setItem('token', t)
export const getRole   = ()        => sessionStorage.getItem('role')
export const setRole   = (r)       => sessionStorage.setItem('role', r)
export const getUser   = ()        => sessionStorage.getItem('username')
export const setUser   = (u)       => sessionStorage.setItem('username', u)
export const getSid    = ()        => sessionStorage.getItem('student_id')
export const setSid    = (s)       => sessionStorage.setItem('student_id', s)
export const clearAuth = ()        => sessionStorage.clear()

function headers(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  }
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password })
  })
  const data = await handle(res)
  setToken(data.access_token)
  setRole(data.role)
  setUser(data.username)
  setSid(data.student_id || '')
  return data
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, {
    method:  'POST',
    headers: headers()
  }).catch(() => {})
  clearAuth()
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({
      current_password: currentPassword,
      new_password:     newPassword
    })
  })
  return handle(res)
}

// ── Students ──────────────────────────────────────────────────────────────────
export async function getStudents() {
  const res = await fetch(`${BASE}/students`, { headers: headers() })
  return handle(res)
}

export async function getStudent(studentId) {
  const res = await fetch(`${BASE}/students/${studentId}`, { headers: headers() })
  return handle(res)
}

export async function enrollStudent(formData) {
  // formData is a FormData object with student_id, name, branch, year, photos
  const res = await fetch(`${BASE}/students/enroll`, {
    method:  'POST',
    headers: authHeaders(),   // no Content-Type — browser sets multipart boundary
    body:    formData
  })
  return handle(res)
}

export async function removeStudent(studentId) {
  const res = await fetch(`${BASE}/students/${studentId}`, {
    method:  'DELETE',
    headers: headers()
  })
  return handle(res)
}

export async function updateStudent(studentId, formData) {
  const res = await fetch(`${BASE}/students/${studentId}`, {
    method:  'PUT',
    headers: authHeaders(),
    body:    formData
  })
  return handle(res)
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function uploadGroupPhoto(file, sessionLabel, threshold = 0.6) {
  const formData = new FormData()
  formData.append('photo', file)
  if (sessionLabel) formData.append('session_label', sessionLabel)
  formData.append('threshold', threshold.toString())

  const res = await fetch(`${BASE}/attendance/upload`, {
    method:  'POST',
    headers: authHeaders(),
    body:    formData
  })
  return handle(res)
}

export async function getAllAttendance(session = null) {
  const url = session
    ? `${BASE}/attendance?session=${encodeURIComponent(session)}`
    : `${BASE}/attendance`
  const res = await fetch(url, { headers: headers() })
  return handle(res)
}

export async function getStudentAttendance(studentId) {
  const res = await fetch(`${BASE}/attendance/${studentId}`, { headers: headers() })
  return handle(res)
}

export async function getSessionAttendance(sessionLabel) {
  const res = await fetch(
    `${BASE}/attendance/session/${encodeURIComponent(sessionLabel)}`,
    { headers: headers() }
  )
  return handle(res)
}

// ── Reports ───────────────────────────────────────────────────────────────────
export async function getReportSummary() {
  const res = await fetch(`${BASE}/reports/summary`, { headers: headers() })
  return handle(res)
}

export async function getStudentReport(studentId) {
  const res = await fetch(`${BASE}/reports/student/${studentId}`, { headers: headers() })
  return handle(res)
}

export async function exportAttendance() {
  const res = await fetch(`${BASE}/reports/export`, { headers: headers() })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'attendance.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Student self-service ──────────────────────────────────────────────────────
export async function getMyProfile() {
  const res = await fetch(`${BASE}/student/me`, { headers: headers() })
  return handle(res)
}

export async function getMyAttendance() {
  const res = await fetch(`${BASE}/student/me/attendance`, { headers: headers() })
  return handle(res)
}
