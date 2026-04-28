import { useEffect, useState } from 'react'
import { getReportSummary, exportAttendance } from '../api/index.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Download, TrendingUp } from 'lucide-react'

export default function Reports() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getReportSummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleExport() {
    setExporting(true)
    try { await exportAttendance() }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const chartData = data?.students?.map(s => ({
    name:  s.name.split(' ')[0],  // first name only for chart
    pct:   s.percentage,
    below: s.below_75
  })) ?? []

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Reports</h1>
          <p>Attendance analytics and export</p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <span className="spinner" />
            : <Download size={15} />
          }
          Export CSV
        </button>
      </div>

      {/* Bar chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 20 }}>
          Attendance % per Student
        </h3>

        {chartData.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={40} />
            <p>No attendance data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-2)', fontSize: 11, fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13
                }}
                formatter={(v) => [`${v}%`, 'Attendance']}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              {/* 75% reference line */}
              <Bar dataKey="pct" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.below ? 'var(--danger)' : 'var(--accent-2)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-2)' }} />
            <span style={{ color: 'var(--text-2)' }}>Above 75%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)' }} />
            <span style={{ color: 'var(--text-2)' }}>Below 75%</span>
          </div>
        </div>
      </div>

      {/* Student table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Year</th>
              <th>Present</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.students?.map(s => (
              <tr key={s.student_id}>
                <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                  {s.student_id}
                </td>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td>{s.branch}</td>
                <td>Year {s.year}</td>
                <td>{s.present}</td>
                <td>{s.total_sessions}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, height: 4,
                      background: 'var(--bg-3)',
                      borderRadius: 99, overflow: 'hidden',
                      minWidth: 60
                    }}>
                      <div style={{
                        width: `${s.percentage}%`,
                        height: '100%',
                        background: s.below_75 ? 'var(--danger)' : 'var(--accent-2)',
                        borderRadius: 99,
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36 }}>
                      {s.percentage}%
                    </span>
                  </div>
                </td>
                <td>
                  {s.below_75
                    ? <span className="badge badge-absent">Low</span>
                    : <span className="badge badge-present">Good</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
