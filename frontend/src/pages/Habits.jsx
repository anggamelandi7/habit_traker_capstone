import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';
import { FaCheckCircle, FaRegCircle, FaTrash } from 'react-icons/fa';
import { DateTime } from 'luxon';

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigate = useNavigate();

  const fetchHabits = async () => {
    try {
      const res = await API.get('/habits');
      setHabits(res.data);
    } catch (err) {
      alert('Session expired. Silakan login ulang.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const addHabit = async (e) => {
    e.preventDefault();

    try {
      const now = DateTime.now().setZone('Asia/Jakarta');
      const start = now.toISO(); // simpan ISO lengkap
      const end = now.plus({ days: frequency === 'Daily' ? 1 : 7 }).toISODate(); // hanya tanggal

      console.log('Waktu tambah habit:', now.toFormat("dd/MM/yyyy • hh.mm a"));

      await API.post('/habits', {
        title,
        frequency,
        startDate: start,
        endDate: end
      });

      setTitle('');
      setFrequency('Daily');
      fetchHabits();
    } catch (err) {
      alert('Gagal menambah habit');
    }
  };

  const toggleCompleted = async (habit) => {
    const confirmed = window.confirm('Apakah kamu yakin sudah menyelesaikan habit ini?');
    if (!confirmed) return;

    try {
      await API.put(`/habits/${habit.id}`, {
        ...habit,
        completed: !habit.completed
      });
      fetchHabits();
    } catch (err) {
      alert('Gagal update habit');
    }
  };

  const deleteHabit = async (id) => {
    try {
      await API.delete(`/habits/${id}`);
      fetchHabits();
    } catch (err) {
      alert('Gagal menghapus habit');
    }
  };

  useEffect(() => {
    fetchHabits();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const total = habits.length;
  const completed = habits.filter(h => h.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    const end = DateTime.fromISO(endDate).setZone('Asia/Jakarta').startOf('day');
    return Math.ceil(end.diff(today, 'days').days);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">📋 Habit Harian Anda</h1>
        <p className="text-gray-600">Kelola dan selesaikan habit Anda setiap hari!</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded shadow mb-6 max-w-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-indigo-700">Progress</span>
          <span className="text-sm font-semibold text-indigo-600">{percentage}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full">
          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>

      {/* Form Tambah Habit */}
      <form onSubmit={addHabit} className="bg-white p-4 rounded shadow mb-6 max-w-md">
        <h2 className="text-xl font-semibold mb-3">Tambah Habit</h2>
        <input
          type="text"
          placeholder="Nama Habit"
          className="w-full mb-3 px-3 py-2 border rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select
          className="w-full mb-3 px-3 py-2 border rounded"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
        </select>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
        >
          Tambah
        </button>
      </form>

      {/* List Habit */}
      <div className="grid gap-4 max-w-xl">
        {habits.length === 0 ? (
          <p className="text-gray-500">Belum ada habit.</p>
        ) : (
          habits.map((habit) => {
            const remaining = getDaysRemaining(habit.endDate);

            const startLuxon = DateTime.fromISO(habit.startDate).setZone('Asia/Jakarta');
            const startDateFormatted = habit.startDate
              ? `${startLuxon.toFormat('d/M/yyyy')} • ${startLuxon.toFormat('hh.mm a')}`
              : '-';

            return (
              <div
                key={habit.id}
                className="flex justify-between items-center bg-white px-4 py-3 rounded shadow"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCompleted(habit)}
                    className="text-xl text-green-600 hover:text-green-700 transition"
                    title="Tandai selesai"
                  >
                    {habit.completed ? <FaCheckCircle /> : <FaRegCircle />}
                  </button>
                  <div>
                    <span
                      className={`block ${
                        habit.completed ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {habit.title}
                      <span className="text-sm text-gray-500 ml-2">({habit.frequency})</span>
                    </span>

                    <span className="text-xs text-gray-500 block">
                      Start: {startDateFormatted} <br />
                      End: {habit.endDate || '-'}
                    </span>

                    {habit.endDate && (
                      <span className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-gray-600'}`}>
                        {remaining < 0
                          ? `❌ Terlambat ${Math.abs(remaining)} hari`
                          : `⏳ Sisa ${remaining} hari`}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="text-red-500 hover:text-red-700 transition"
                  title="Hapus habit"
                >
                  <FaTrash />
                </button>
              </div>
            );
          })
        )}
      </div>
    </MainLayout>
  );
}
