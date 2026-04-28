import { useEffect, useState } from 'react'
import { getMyProfile, getMyAttendance } from '../api/index.js'
import { CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react'

export default function StudentDashboard() {
  const [profile,    setProfile]    = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([getMyProfile(), getMyAttendance()])
      .then(([p, a]) => { setProfile(p); setAttendance(a) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const total   = attendance.length
  const present = attendance.filter(a => a.status === 'Present').length
  const absent  = total - present
  const pct     = total > 0 ? Math.round(present / total * 100) : 0
  const isLow   = pct < 75 && total > 0

  return (
    <div className="fade-in">
      {/* Profile header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 32,
        padding: '24px',
        background: 'var(--bg-2)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <User size={24} color="var(--accent)" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{profile?.name}</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 2 }}>
            {profile?.student_id} · {profile?.branch} · Year {profile?.year}
          </div>
        </div>
      </div>

      {/* Low attendance warning */}
      {isLow && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '14px 18px',
          background: 'var(--danger-dim)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius)',
          marginBottom: 24
        }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14 }}>
            <strong style={{ color: 'var(--danger)' }}>Low attendance warning.</strong>
            <span style={{ color: 'var(--text-2)', marginLeft: 6 }}>
              Your attendance is {pct}%, which is below the required 75%.
              Please attend classes regularly.
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {[
          { label: 'Total Sessions', value: total,   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
          { label: 'Present',        value: present,  color: 'var(--accent-2)', bg: 'var(--accent-2-dim)' },
          { label: 'Absent',         value: absent,   color: 'var(--danger)',   bg: 'var(--danger-dim)' },
          { label: 'Attendance %',   value: `${pct}%`, color: isLow ? 'var(--danger)' : 'var(--accent)', bg: isLow ? 'var(--danger-dim)' : 'var(--accent-dim)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px 24px'
          }}>
            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 700, color }}>
              {value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Attendance Progress</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: isLow ? 'var(--danger)' : 'var(--accent-2)' }}>
            {pct}%
          </span>
        </div>
        <div style={{
          height: 10, background: 'var(--bg-3)',
          borderRadius: 99, overflow: 'hidden'
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: isLow ? 'var(--danger)' : 'var(--accent-2)',
            borderRadius: 99,
            transition: 'width 0.8s ease'
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          marginTop: 6, fontSize: 11, color: 'var(--text-3)'
        }}>
          75% required
        </div>
      </div>

      {/* Attendance history */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Session History</h2>
      </div>

      {attendance.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} />
          <p>No attendance records yet</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {[...attendance].reverse().map((a, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{a.session}</td>
                  <td>
                    <span className={`badge ${a.status === 'Present' ? 'badge-present' : 'badge-absent'}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      {a.status === 'Present'
                        ? <CheckCircle size={11} />
                        : <XCircle size={11} />
                      }
                      {a.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {a.confidence ? a.confidence.toFixed(4) : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {a.marked_at?.slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
