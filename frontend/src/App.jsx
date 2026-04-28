import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken, getRole } from './api/index.js'

import Login            from './pages/Login.jsx'
import AdminDashboard   from './pages/AdminDashboard.jsx'
import Students         from './pages/Students.jsx'
import Enroll           from './pages/Enroll.jsx'
import MarkAttendance   from './pages/MarkAttendance.jsx'
import AttendanceSheet  from './pages/AttendanceSheet.jsx'
import Reports          from './pages/Reports.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import Layout           from './components/Layout.jsx'

function RequireAuth({ children, role }) {
  const token = getToken()
  const r     = getRole()
  if (!token) return <Navigate to="/login" replace />
  if (role && r !== role) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAuth role="admin">
            <Layout role="admin" />
          </RequireAuth>
        }>
          <Route index          element={<AdminDashboard />} />
          <Route path="students"    element={<Students />} />
          <Route path="enroll"      element={<Enroll />} />
          <Route path="attendance"  element={<MarkAttendance />} />
          <Route path="sheet"       element={<AttendanceSheet />} />
          <Route path="reports"     element={<Reports />} />
        </Route>

        {/* Student routes */}
        <Route path="/student" element={
          <RequireAuth role="student">
            <Layout role="student" />
          </RequireAuth>
        }>
          <Route index element={<StudentDashboard />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
