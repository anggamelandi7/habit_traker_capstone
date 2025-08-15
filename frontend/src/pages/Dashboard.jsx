
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHabits } from '../api/habits';
import { getLedgerSummary, claimReward } from '../api/rewards';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// helper: ambil label minggu (Senin awal minggu) di WIB
function weekLabelWIB(dateIso) {
  const d = new Date(dateIso);
  // paksa ke WIB (tanpa lib, cukup tampilkan DD/MM)
  const opts = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit' };
  return new Intl.DateTimeFormat('en-GB', opts).format(d); // e.g. 13/08
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summaryHabits, setSummaryHabits] = useState({ total: 0, completed: 0, pending: 0 });
  const [progress, setProgress] = useState([]); // [{week: 'DD/MM', completed: n}]
  const [username, setUsername] = useState(''); // opsional: bisa simpan di localStorage saat login
  const [points, setPoints] = useState(0);
  const [rewardsHistory, setRewardsHistory] = useState([]);
  const [bestClaimable, setBestClaimable] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // 1) Habits
      const habits = await getHabits();
      const total = Array.isArray(habits) ? habits.length : 0;
      // Saat ini tidak ada flag completed per hari di FE; tampilkan pending=total
      setSummaryHabits({ total, completed: 0, pending: total });

      // 2) Ledger summary + items
      const ledger = await getLedgerSummary();
      const sum = ledger?.summary || {};
      setPoints(sum.totalBalance ?? 0);
      setBestClaimable(sum.rewardProgress?.bestClaimable || null);

      // 2a) Grafik progres mingguan → hitung dari ledger items (+delta dari habit completion)
      const items = Array.isArray(ledger?.items) ? ledger.items : [];
      const byWeek = new Map();
      for (const it of items) {
        if (it.delta > 0 && it.habit) {
          const label = weekLabelWIB(it.atUTC);
          byWeek.set(label, (byWeek.get(label) || 0) + 1);
        }
      }
      const prog = Array.from(byWeek.entries())
        .map(([week, completed]) => ({ week, completed }))
        .slice(-8);
      setProgress(prog);

      // 2b) Riwayat reward → dari ledger items delta negatif (klaim)
      const history = items
        .filter(it => it.delta < 0 && it.reward)
        .map(it => ({
          name: it.reward.name,
          points: Math.abs(it.delta),
          at: it.atWIB
        }));
      setRewardsHistory(history);

      // 3) Username (opsional): kalau disimpan saat login, ambil di sini
      const u = localStorage.getItem('username');
      if (u) setUsername(u);

    } catch (e) {
      if (e?.status === 401) {
        localStorage.removeItem('token');
        setMsg('Session expired. Silakan login ulang.');
        navigate('/login');
      } else {
        setMsg(e?.error || 'Gagal memuat dashboard.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClaimBest = async () => {
    if (!bestClaimable) return;
    try {
      await claimReward(bestClaimable.id);
      setMsg(`Berhasil klaim: ${bestClaimable.name}`);
      await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal klaim reward');
    }
  };

  if (loading) return null;

  return (
    <div>
      {msg && <div className="mb-4 p-3 border rounded text-sm">{msg}</div>}

      {/* HERO / GUIDE */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
          Selamat datang di Habit Tracker App 🎉
        </h1>
        <p className="text-gray-600 mt-2">
          Ayo buat pencapaian dengan menyelesaikan habitmu. Tentukan target poin (pencapaian),
          susun habit-habit pendukung, kumpulkan poin, lalu klaim hadiahnya!
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <Link
            to="/achievements"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition"
          >
            🚀 Buat Pencapaian
          </Link>
          <Link
            to="/habits"
            className="inline-flex items-center gap-2 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full hover:bg-indigo-50 transition"
          >
            ➕ Tambah Habit
          </Link>
        </div>

        <ul className="mt-4 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li><span className="font-medium">Anti-cheat aktif:</span> Habit Daily hanya bisa diselesaikan 1x per hari (WIB), Weekly 1x per minggu.</li>
          <li><span className="font-medium">Transparan:</span> Semua perubahan poin tercatat di Ledger untuk audit & grafik.</li>
          <li><span className="font-medium">Fleksibel:</span> Kamu bisa mengelompokkan beberapa habit dalam satu Pencapaian (Card).</li>
        </ul>
      </div>

      {/* KPI & Klaim Singkat */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">📊 Statistik Habit</h2>
          <p>Total Habit: <span className="font-bold">{summaryHabits.total}</span></p>
          <p>Completed (minggu ini)*: <span className="text-green-600">
            {progress.length ? progress[progress.length - 1].completed : 0}
          </span></p>
          <p>Pending: <span className="text-yellow-600">{summaryHabits.pending}</span></p>
          <p className="text-xs text-gray-400 mt-2">*Dihitung dari ledger (penyelesaian habit per minggu)</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">🎁 Reward & Poin</h2>
          <p>Total Points: <span className="font-bold">{points}</span></p>
          {bestClaimable ? (
            <button
              onClick={onClaimBest}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition"
            >
              Klaim: {bestClaimable.name} ({bestClaimable.requiredPoints})
            </button>
          ) : (
            <p className="text-gray-600 mt-2">Belum ada reward yang bisa diklaim.</p>
          )}
        </div>
      </div>

      {/* Grafik Progres Mingguan */}
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

      {/* Riwayat Klaim Reward */}
      <div className="bg-white rounded-2xl shadow p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-3">📜 Riwayat Reward</h2>
        {rewardsHistory.length === 0 ? (
          <p className="text-gray-500">Belum ada klaim reward.</p>
        ) : (
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {rewardsHistory.map((r, i) => (
              <li key={i}>{r.name} (−{r.points}) • {r.at}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
