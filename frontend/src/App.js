import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Rewards from './pages/Rewards';
import Stats from './pages/Stats';
import Login from './pages/Login';
import Register from './pages/Register';
import Logout from './pages/Logout';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      {/* Public routes */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected (butuh token) */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/achievements" element={<Achievements />} /> 
           <Route path="/profile" element={<Profile />} />
          <Route path="/logout" element={<Logout />} />

          {/* default & fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
