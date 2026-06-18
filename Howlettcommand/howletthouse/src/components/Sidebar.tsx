import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Users, FolderKanban,
  Video, MessageSquare, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',         label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/jordan',   label: "Jordan's whereabouts", icon: MapPin },
  { to: '/crew',     label: 'Crew',               icon: Users },
  { to: '/projects', label: 'Projects',            icon: FolderKanban },
  { to: '/content',  label: 'Content calendar',   icon: Video },
  { to: '/messages', label: 'Messages',            icon: MessageSquare },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-hh-green text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
            HH
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">Howlett House</div>
            <div className="text-xs text-gray-400 leading-tight">The motherboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-hh-green text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">
              {user?.email?.split('@')[0] ?? 'Crew member'}
            </div>
            <div className="text-xs text-gray-400">Mission control</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-gray-400 hover:text-red-500"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
