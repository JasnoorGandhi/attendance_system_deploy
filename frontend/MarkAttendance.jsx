import { useState } from 'react'
import { uploadGroupPhoto } from '../api/index.js'
import { Camera, Upload, CheckCircle, XCircle, User } from 'lucide-react'

export default function MarkAttendance() {
  const [file,         setFile]         = useState(null)
  const [preview,      setPreview]      = useState(null)
  const [sessionLabel, setSessionLabel] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [threshold,    setThreshold]    = useState(0.6)
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState('')

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError('')
  }

  async function handleUpload() {
    if (!file) { setError('Please select a group photo first.'); return }
    setError('')
    setLoading(true)
    try {
      const data = await uploadGroupPhoto(file, sessionLabel, threshold)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Mark Attendance</h1>
        <p>Upload a group photo to automatically mark attendance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left — upload */}
        <div>
          <div className="card">
            <h3 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              Session Settings
            </h3>

            <div className="form-group">
              <label className="label">Session Label</label>
              <input
                className="input"
                type="text"
                value={sessionLabel}
                onChange={e => setSessionLabel(e.target.value)}
                placeholder="e.g. 2024-01-15 or 2024-01-15_Lab1"
              />
            </div>

            <div className="form-group">
              <label className="label">
                Recognition Threshold — {threshold}
                <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 8 }}>
                  (lower = stricter)
                </span>
              </label>
              <input
                type="range"
                min="0.4" max="0.8" step="0.05"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--text-3)', marginTop: 4
              }}>
                <span>0.4 (strict)</span>
                <span>0.8 (lenient)</span>
              </div>
            </div>

            <h3 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 600, marginBottom: 12, marginTop: 8 }}>
              Group Photo
            </h3>

            {/* Drop zone */}
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: preview ? 0 : '40px 20px',
              border: '2px dashed var(--border-2)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              overflow: 'hidden',
              background: 'var(--bg-3)',
              minHeight: preview ? 0 : 160
            }}>
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <>
                  <Camera size={32} color="var(--text-3)" />
                  <span style={{ color: 'var(--text-2)', fontSize: 14 }}>
                    Click to upload group photo
                  </span>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    JPG or PNG
                  </span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>

            {preview && (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, marginTop: 8, fontSize: 13, color: 'var(--text-3)',
                cursor: 'pointer'
              }}>
                <Upload size={13} />
                Change photo
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            )}

            {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}

            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={loading || !file}
              style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '12px' }}
            >
              {loading
                ? <><span className="spinner" /> Recognising faces...</>
                : <><Camera size={15} /> Mark Attendance</>
              }
            </button>
          </div>
        </div>

        {/* Right — results */}
        <div>
          {result ? (
            <div className="fade-in">
              {/* Annotated image */}
              {result.annotated_image && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                  <img
                    src={`data:image/jpeg;base64,${result.annotated_image}`}
                    alt="Annotated"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 16 }}>
                  Session: {result.session}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Detected',  value: result.detected,  color: '#3b82f6' },
                    { label: 'Present',   value: result.present,   color: 'var(--accent-2)' },
                    { label: 'Absent',    value: result.absent,    color: 'var(--danger)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      background: 'var(--bg-3)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color }}>
                        {value}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recognised list */}
              {result.recognised?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                    Recognised Students
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.recognised.map(s => (
                      <div key={s.student_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg-3)',
                        borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle size={14} color="var(--accent-2)" />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                              {s.student_id}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          dist: {s.confidence?.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <User size={48} color="var(--text-3)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
                Upload a group photo to see recognition results here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
