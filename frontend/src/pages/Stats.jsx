// pages/Stats.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

export default function Stats() {
  const [progress, setProgress] = useState([]);
  const [frequencyStats, setFrequencyStats] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [resProgress, resHabits] = await Promise.all([
        API.get('/habits/progress'),
        API.get('/habits')
      ]);

      setProgress(resProgress.data);

      // Hitung jumlah habit berdasarkan frequency
      const count = { Daily: 0, Weekly: 0 };
      resHabits.data.forEach(h => {
        if (h.frequency === 'Daily') count.Daily++;
        else if (h.frequency === 'Weekly') count.Weekly++;
      });

      setFrequencyStats([
        { frequency: 'Daily', count: count.Daily },
        { frequency: 'Weekly', count: count.Weekly }
      ]);
    } catch (err) {
      alert('Session expired. Silakan login ulang.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">📈 Statistik Habit</h1>
        <p className="text-gray-600">Lihat analisis kebiasaanmu berdasarkan data habit.</p>
      </div>

      {/* Grafik Mingguan */}
      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Progres Habit Selesai per Minggu</h2>
        {progress.length === 0 ? (
          <p className="text-gray-500">Belum ada data progres.</p>
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

      {/* Grafik Frekuensi Habit */}
      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Jumlah Habit Berdasarkan Frekuensi</h2>
        {frequencyStats.length === 0 ? (
          <p className="text-gray-500">Belum ada habit.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={frequencyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="frequency" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </MainLayout>
  );
}
