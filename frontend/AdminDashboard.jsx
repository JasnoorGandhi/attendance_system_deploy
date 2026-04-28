import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReportSummary } from '../api/index.js'
import { Users, CalendarCheck, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getReportSummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const stats = [
    {
      label: 'Total Students',
      value: data?.total_students ?? 0,
      icon:  Users,
      color: '#3b82f6',
      bg:    'rgba(59,130,246,0.12)'
    },
    {
      label: 'Sessions Held',
      value: data?.total_sessions ?? 0,
      icon:  CalendarCheck,
      color: 'var(--accent)',
      bg:    'var(--accent-dim)'
    },
    {
      label: 'Overall Attendance',
      value: `${data?.overall_present ?? 0}%`,
      icon:  TrendingUp,
      color: 'var(--accent-2)',
      bg:    'var(--accent-2-dim)'
    },
    {
      label: 'Below 75%',
      value: data?.below_75_count ?? 0,
      icon:  AlertTriangle,
      color: 'var(--danger)',
      bg:    'var(--danger-dim)'
    }
  ]

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of attendance system</p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Quick Actions</h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {[
          { label: 'Mark Today\'s Attendance', desc: 'Upload a group photo', path: '/admin/attendance', color: 'var(--accent)' },
          { label: 'Enroll New Student',       desc: 'Add to the system',    path: '/admin/enroll',     color: 'var(--accent-2)' },
          { label: 'View Attendance Sheet',    desc: 'Full records',         path: '/admin/sheet',      color: '#3b82f6' },
          { label: 'View Reports',             desc: 'Analytics & export',   path: '/admin/reports',    color: '#a855f7' },
        ].map(({ label, desc, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = color
              e.currentTarget.style.background  = 'var(--bg-3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background  = 'var(--bg-2)'
            }}
          >
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</div>
            </div>
            <ArrowRight size={16} color={color} />
          </button>
        ))}
      </div>

      {/* Students below 75% */}
      {data?.students?.filter(s => s.below_75).length > 0 && (
        <>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, color: 'var(--danger)' }}>
              ⚠ Students Below 75% Attendance
            </h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {data.students.filter(s => s.below_75).map(s => (
                  <tr key={s.student_id}>
                    <td style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{s.student_id}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.branch}</td>
                    <td>{s.present}</td>
                    <td>{s.total_sessions}</td>
                    <td>
                      <span className="badge badge-absent">{s.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
