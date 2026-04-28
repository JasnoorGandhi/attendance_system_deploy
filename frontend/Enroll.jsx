import { useState } from 'react'
import { enrollStudent } from '../api/index.js'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, Image } from 'lucide-react'

export default function Enroll() {
  const [form, setForm] = useState({
    student_id: '', name: '', branch: 'CSE', year: 2
  })
  const [photos,   setPhotos]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')
  const navigate = useNavigate()

  function handleField(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files)
    setPhotos(files)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (photos.length < 5) {
      setError('Please upload at least 5 face photos for reliable recognition.')
      return
    }

    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('student_id', form.student_id)
      fd.append('name',       form.name)
      fd.append('branch',     form.branch)
      fd.append('year',       form.year)
      photos.forEach(p => fd.append('photos', p))

      await enrollStudent(fd)
      setSuccess(`${form.name} enrolled successfully! Login: ${form.student_id} / ${form.student_id}`)
      setForm({ student_id: '', name: '', branch: 'CSE', year: 2 })
      setPhotos([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Enroll Student</h1>
        <p>Add a new student to the system</p>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="label">Student ID *</label>
                <input
                  className="input"
                  name="student_id"
                  placeholder="e.g. 2023CS061"
                  value={form.student_id}
                  onChange={handleField}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleField}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="label">Branch *</label>
                <select
                  className="input"
                  name="branch"
                  value={form.branch}
                  onChange={handleField}
                >
                  {['CSE','ECE','ME','CE','EEE','IT','AI'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Year *</label>
                <select
                  className="input"
                  name="year"
                  value={form.year}
                  onChange={handleField}
                >
                  {[1,2,3,4].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo upload */}
            <div className="form-group">
              <label className="label">
                Face Photos * (minimum 10 recommended, at least 5 required)
              </label>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '28px 20px',
                border: '2px dashed var(--border-2)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                background: photos.length > 0 ? 'var(--accent-2-dim)' : 'var(--bg-3)'
              }}>
                {photos.length > 0 ? (
                  <>
                    <CheckCircle size={28} color="var(--accent-2)" />
                    <span style={{ color: 'var(--accent-2)', fontWeight: 500, fontSize: 14 }}>
                      {photos.length} photos selected
                    </span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      Click to change
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="var(--text-3)" />
                    <span style={{ color: 'var(--text-2)', fontSize: 14 }}>
                      Click to upload face photos
                    </span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      JPG, PNG — multiple files allowed
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Photo preview thumbnails */}
            {photos.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16
              }}>
                {photos.slice(0, 8).map((p, i) => (
                  <div key={i} style={{
                    width: 52, height: 52,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                  }}>
                    <img
                      src={URL.createObjectURL(p)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
                {photos.length > 8 && (
                  <div style={{
                    width: 52, height: 52,
                    borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'var(--text-2)'
                  }}>
                    +{photos.length - 8}
                  </div>
                )}
              </div>
            )}

            {error   && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/admin/students')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {loading
                  ? <><span className="spinner" /> Enrolling...</>
                  : 'Enroll Student'
                }
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: 16, padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Image size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>Photo tips:</strong> Use clear,
              well-lit frontal face photos. Include slight variations in angle and
              expression. Avoid heavy filters or sunglasses. 10–15 photos gives the
              best recognition accuracy.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
