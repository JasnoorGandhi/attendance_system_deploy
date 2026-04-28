import { useEffect, useState } from 'react'
import { getAllAttendance } from '../api/index.js'
import { Search, Filter } from 'lucide-react'

export default function AttendanceSheet() {
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [session,  setSession]  = useState('')
  const [sessions, setSessions] = useState([])
  const [filter,   setFilter]   = useState('all')  // all | present | absent

  async function load() {
    setLoading(true)
    try {
      const data = await getAllAttendance(session || null)
      setRecords(data)
      // extract unique sessions
      const unique = [...new Set(data.map(r => r.session))].sort().reverse()
      setSessions(unique)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session])

  const filtered = records.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                        r.student_id.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
                        (filter === 'present' && r.status === 'Present') ||
                        (filter === 'absent'  && r.status === 'Absent')
    return matchSearch && matchFilter
  })

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Attendance Sheet</h1>
        <p>{records.length} records {session ? `for session ${session}` : 'across all sessions'}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-3)'
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ width: 'auto', minWidth: 180 }}
          value={session}
          onChange={e => setSession(e.target.value)}
        >
          <option value="">All Sessions</option>
          {sessions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'],['present','Present'],['absent','Absent']].map(([v,l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="btn"
              style={{
                padding: '8px 14px',
                fontSize: 13,
                background: filter === v ? 'var(--accent)' : 'var(--bg-3)',
                color: filter === v ? '#0a0e1a' : 'var(--text-2)',
                border: '1px solid var(--border)'
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Filter size={48} />
          <p>No records found</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Session</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                    {r.student_id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ fontSize: 13 }}>
                    <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                      {r.session}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {r.confidence ? r.confidence.toFixed(4) : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {r.marked_at?.slice(0, 16).replace('T', ' ')}
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
