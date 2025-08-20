import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar'; // sesuaikan path jika berbeda

const TITLE_MAP = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/habits': 'Habits',
  '/achievements': 'Achievements',
  '/rewards': 'Rewards',
  '/stats': 'Stats',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

function toTitleCase(s = '') {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveTitle(pathname) {
  const segs = (pathname || '/')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean);
  const root = '/' + (segs[0] || 'dashboard');
  return TITLE_MAP[root] || toTitleCase(segs[0] || 'dashboard');
}

export default function MainLayout() {
  const { pathname } = useLocation();

  // 👉 state sidebar diangkat ke layout
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const pageTitle = useMemo(() => deriveTitle(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar tetap fixed di kiri, kontrol via props */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Area konten: margin-left dinamis mengikuti lebar sidebar */}
      <div className={`${collapsed ? 'ml-20' : 'ml-64'} transition-[margin] duration-200`}>
        {/* Top bar: hanya judul halaman */}
        <header className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center">
          <h2 className="text-lg font-semibold">{pageTitle}</h2>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
