// pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

function Dashboard() {
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0 });
  const [progress, setProgress] = useState([]);
  const [username, setUsername] = useState('');
  const [points, setPoints] = useState(0);
  const [badge, setBadge] = useState('');
  const [rewards, setRewards] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchAll = async () => {
    try {
      const [resProfile, resSummary, resProgress, resRewards] = await Promise.all([
      API.get('/users/me'),
      API.get('/habits/summary'),
      API.get('/habits/progress'),
      API.get('/rewards')
      ]);
      setUsername(resProfile.data.username);
      setSummary(resSummary.data);
      setProgress(resProgress.data);
      setPoints(resProfile.data.totalPoints); 
      setBadge(resProfile.data.badge);      
    } catch (err) {
      alert('Session expired. Silakan login ulang.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const claimReward = async () => {
    try {
      await API.post('/rewards/claim');
      alert('Reward berhasil diklaim!');
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal klaim reward');
    }
  };

  // 🔁 Ini akan jalan setiap pertama kali load + jika klik ulang /dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    fetchAll();
  }, [location.pathname]); // 👈 penting agar klik ulang sidebar tetap fetch ulang

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Hi, {username} 👋</h1>
        <p className="text-gray-600">Selamat datang di Habit Tracker!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">📊 Statistik Habit</h2>
          <p>Total Habit: <span className="font-bold">{summary.total}</span></p>
          <p>Completed: <span className="text-green-600">{summary.completed}</span></p>
          <p>Pending: <span className="text-yellow-600">{summary.pending}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">🎁 Reward & Badge</h2>
          <p>Total Points: <span className="font-bold">{points}</span></p>
          <p>Badge: <span className="font-bold text-indigo-700">{badge}</span></p>
          <button
            onClick={claimReward}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition"
          >
            Klaim Reward
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-6 w-full max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">📈 Grafik Progres Mingguan</h2>
        {progress.length === 0 ? (
          <p className="text-gray-500">Belum ada habit yang selesai.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progress}>
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-3">📜 Riwayat Reward</h2>
        {rewards.length === 0 ? (
          <p className="text-gray-500">Belum ada reward.</p>
        ) : (
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {rewards.map((r, i) => (
              <li key={i}>{r.title || r.name} (+{r.points} poin)</li>
            ))}
          </ul>
        )}
      </div>
    </MainLayout>
  );
}

export default Dashboard;
