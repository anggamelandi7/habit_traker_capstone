// components/Layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const menu = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Habits', path: '/habits' },
    { label: 'Achievements', path: '/achievements' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'Statistik', path: '/stats' },
    { label: 'Logout', path: '/logout' }
  ];

  return (
    <aside className="w-64 h-screen bg-white shadow-md p-6 fixed top-0 left-0">
      <h1 className="text-2xl font-bold text-indigo-600 mb-8">🧠 HabitApp</h1>
      <nav className="space-y-4">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-indigo-100 ${
                isActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700'
              }`
            }
            aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
