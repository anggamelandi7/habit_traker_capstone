import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Gift,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  User2,
  LogOut,
} from 'lucide-react';

// Menu utama & sekunder
const PRIMARY = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Habits', path: '/habits', icon: CheckSquare },
  { label: 'Achievements', path: '/achievements', icon: Target },
  { label: 'Rewards', path: '/rewards', icon: Gift },
  { label: 'Stats', path: '/stats', icon: BarChart3 },
];
const SECONDARY = [{ label: 'Settings', path: '/settings', icon: Settings }];

function cx(...a) { return a.filter(Boolean).join(' '); }

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cx(
          'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
          'text-gray-600 hover:text-indigo-700 hover:bg-indigo-50',
          isActive && 'bg-indigo-100/60 text-indigo-700 font-medium'
        )
      }
      aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

// 👉 Sidebar membaca & mengubah state via props (bukan internal)
export default function Sidebar({ collapsed, setCollapsed }) {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // info user opsional dari localStorage
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [pathname]);

  const username = user?.username || user?.name || 'User';
  const email = user?.email || '';
  const initials = (username?.[0] || 'U').toUpperCase();

  // dropdown profil
  const [openProfile, setOpenProfile] = useState(false);
  useEffect(() => { setOpenProfile(false); }, [pathname]);

  const onLogout = () => {
    nav('/logout'); // atau bersihkan token & redirect ke login
    // localStorage.removeItem('token');
    // nav('/login');
  };

  return (
    <aside
      className={cx(
        'fixed top-0 left-0 h-screen border-r bg-white shadow-sm',
        'flex flex-col transition-[width] duration-200',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand + toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center font-bold">H</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 leading-tight">HabitApp</div>
              <div className="text-[11px] text-gray-500 leading-none">Track your habits</div>
            </div>
          )}
        </div>
        <button
          className="p-1.5 rounded-md border text-gray-600 hover:bg-gray-50"
          onClick={() => setCollapsed(v => !v)}
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 overflow-y-auto flex-1">
        {!collapsed && <div className="px-2 text-xs font-semibold text-gray-500 mb-2">MENU</div>}
        <div className="space-y-1">
          {PRIMARY.map((m) => (
            <NavItem key={m.path} to={m.path} icon={m.icon} label={m.label} collapsed={collapsed} />
          ))}
        </div>

        <div className="mt-6">
          {!collapsed && <div className="px-2 text-xs font-semibold text-gray-500 mb-2">LAINNYA</div>}
          <div className="space-y-1">
            {SECONDARY.map((m) => (
              <NavItem key={m.path} to={m.path} icon={m.icon} label={m.label} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer: Profil */}
      <div className="p-3 border-t relative">
        <button
          onClick={() => setOpenProfile((v) => !v)}
          className={cx('w-full flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-gray-50')}
          title={collapsed ? 'Profil' : undefined}
        >
          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-semibold">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{username}</div>
              {email && <div className="text-xs text-gray-500 truncate">{email}</div>}
            </div>
          )}
        </button>

        {openProfile && (
          <div className="absolute left-3 right-3 bottom-14 bg-white border shadow-lg rounded-lg overflow-hidden z-10">
            <NavLink
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => setOpenProfile(false)}
            >
              <User2 className="h-4 w-4" />
              <span>Profile</span>
            </NavLink>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
