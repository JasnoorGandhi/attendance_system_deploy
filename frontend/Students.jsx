import { useEffect, useState } from 'react'
import { getStudents, removeStudent } from '../api/index.js'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Search } from 'lucide-react'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [deleting, setDeleting] = useState(null)
  const [error,    setError]    = useState('')
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    try {
      const data = await getStudents()
      setStudents(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(studentId) {
    if (!confirm(`Remove student ${studentId}? This cannot be undone.`)) return
    setDeleting(studentId)
    try {
      await removeStudent(studentId)
      setStudents(prev => prev.filter(s => s.student_id !== studentId))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase()) ||
    s.branch.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Students</h1>
        <p>{students.length} enrolled students</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-3)'
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, ID or branch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin/enroll')}
        >
          <UserPlus size={15} />
          Enroll Student
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <UserPlus size={48} />
          <p>{search ? 'No students match your search' : 'No students enrolled yet'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Year</th>
                <th>Enrolled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.student_id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-2)', fontSize: 13 }}>
                    {s.student_id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                      {s.branch}
                    </span>
                  </td>
                  <td>Year {s.year}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                    {s.enrolled_at?.slice(0, 10)}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleDelete(s.student_id)}
                      disabled={deleting === s.student_id}
                    >
                      {deleting === s.student_id
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <Trash2 size={13} />
                      }
                      Remove
                    </button>
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
