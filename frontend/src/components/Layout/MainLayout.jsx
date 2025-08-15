import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import HeaderBalance from '../HeaderBalance';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fixed */}
      <Sidebar />

      {/* Area utama digeser 64 (lebar sidebar) */}
      <div className="ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          {/* Saldo + info reward */}
          <HeaderBalance />
        </header>

        {/* Konten halaman */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
