// pages/Logout.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Hapus token dari localStorage
    localStorage.removeItem('token');

    // Redirect ke halaman login setelah logout
    navigate('/login');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50">
      <p className="text-gray-600 text-lg">Logging out...</p>
    </div>
  );
}
