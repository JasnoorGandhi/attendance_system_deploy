import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../api/index.js'
import {
  LayoutDashboard, Users, UserPlus, Camera,
  ClipboardList, BarChart3, LogOut, Scan
} from 'lucide-react'

const adminNav = [
  { to: '/admin',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/students',  label: 'Students',   icon: Users },
  { to: '/admin/enroll',    label: 'Enroll',     icon: UserPlus },
  { to: '/admin/attendance',label: 'Mark Attendance', icon: Camera },
  { to: '/admin/sheet',     label: 'Attendance Sheet', icon: ClipboardList },
  { to: '/admin/reports',   label: 'Reports',    icon: BarChart3 },
]

const studentNav = [
  { to: '/student', label: 'My Attendance', icon: ClipboardList, end: true },
]

export default function Layout({ role }) {
  const nav      = role === 'admin' ? adminNav : studentNav
  const navigate = useNavigate()
  const username = getUser()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Scan size={18} color="#0a0e1a" />
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
              AttendX
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {role === 'admin' ? 'Admin Panel' : 'Student Portal'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--text-2)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                marginBottom: 2,
                transition: 'all 0.15s'
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{
          padding: '16px 12px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--bg-3)'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                {username}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                {role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                transition: 'color 0.15s'
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: '36px 40px',
        minHeight: '100vh'
      }}>
        <Outlet />
      </main>
    </div>
  )
}
