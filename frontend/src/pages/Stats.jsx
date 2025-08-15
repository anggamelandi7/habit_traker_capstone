// src/pages/Stats.jsx
import { useEffect, useMemo, useState } from 'react';
import { getHabits } from '../api/habits';
import { getLedgerSummary } from '../api/rewards';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

function fmtWIB(d) {
  if (!d) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(d));
}

function labelDayMonthWIB(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit'
  }).format(new Date(iso));
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState(null);

  useEffect(()=> {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [h, l] = await Promise.all([getHabits(), getLedgerSummary()]);
        if (!mounted) return;
        setHabits(Array.isArray(h) ? h : []);
        setLedger(l || {});
      } catch (e) {
        if (!mounted) return;
        setError(e?.error || 'Gagal memuat statistik');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const items = useMemo(()=> Array.isArray(ledger?.items) ? ledger.items : [], [ledger]);
  const totalBalance = Number(ledger?.summary?.totalBalance ?? 0);

  // KPI
  const kpi = useMemo(()=> {
    const totalHabits = habits.length;
    const completions = items.filter(it => it.delta > 0 && it.habit).length;
    const claims = items.filter(it => it.delta < 0 && it.reward).length;
    return { totalHabits, completions, claims, totalBalance };
  }, [habits, items, totalBalance]);

  // Grafik: completion per minggu (label WIB DD/MM, agregasi kasar per hari -> per label)
  const weeklyCompletion = useMemo(()=> {
    const map = new Map();
    for (const it of items) {
      if (it.delta > 0 && it.habit) {
        const lbl = labelDayMonthWIB(it.atUTC);
        map.set(lbl, (map.get(lbl) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([week, completed]) => ({ week, completed }))
      .sort((a,b)=> a.week.localeCompare(b.week))
      .slice(-8);
  }, [items]);

  // Grafik: tren saldo poin (pakai balanceAfter & tanggal WIB)
  const balanceTrend = useMemo(()=> {
    // items sudah urut DESC (terbaru -> lama); kita balik agar chart berjalan maju
    const arr = [...items].reverse().map(it => ({
      date: labelDayMonthWIB(it.atUTC),
      balance: Number(it.balanceAfter)
    }));
    // grup per label (ambil terakhir untuk hari tsb)
    const map = new Map();
    for (const x of arr) map.set(x.date, x.balance);
    return Array.from(map.entries()).map(([date, balance]) => ({ date, balance }));
  }, [items]);

  // Distribusi habit: Daily vs Weekly
  const habitFreq = useMemo(()=> {
    const counts = habits.reduce((acc, h) => {
      const f = (h.frequency || 'Unknown');
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});
    const order = ['Daily', 'Weekly'];
    const data = order.map(k => ({ type: k, count: counts[k] || 0 }));
    // sisakan kategori lain jika ada
    Object.keys(counts).forEach(k => {
      if (!order.includes(k)) data.push({ type: k, count: counts[k] });
    });
    return data;
  }, [habits]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      {error && <div className="p-3 border rounded text-sm text-red-700 bg-red-50">{error}</div>}

      {/* KPI */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Habits</div>
          <div className="text-3xl font-semibold">{kpi.totalHabits}</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Completion</div>
          <div className="text-3xl font-semibold text-green-600">{kpi.completions}</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Claims</div>
          <div className="text-3xl font-semibold text-indigo-600">{kpi.claims}</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Saldo Poin</div>
          <div className="text-3xl font-semibold">{kpi.totalBalance}</div>
        </div>
      </div>

      {/* Completion per Minggu (Bar) */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Completion per Minggu (WIB)</h2>
          <div className="text-sm text-gray-500">Sumber: Ledger (+delta, ada habit)</div>
        </div>
        {weeklyCompletion.length === 0
          ? <div className="text-gray-500">Belum ada completion yang terekam.</div>
          : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyCompletion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Tren Saldo Poin (Line) */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tren Saldo Poin</h2>
          <div className="text-sm text-gray-500">Sumber: Ledger (balanceAfter)</div>
        </div>
        {balanceTrend.length === 0
          ? <div className="text-gray-500">Belum ada mutasi poin.</div>
          : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="balance" name="Balance" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Distribusi Frekuensi Habit */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Distribusi Frekuensi Habit</h2>
          <div className="text-sm text-gray-500">Sumber: /habits</div>
        </div>
        {habitFreq.length === 0
          ? <div className="text-gray-500">Belum ada habit.</div>
          : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={habitFreq}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Jumlah" />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Riwayat (10 terbaru) */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Riwayat Poin (10 terbaru)</h2>
        {items.length === 0 ? (
          <div className="text-gray-500">Belum ada riwayat.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Tanggal (WIB)</th>
                  <th className="py-2 pr-4">Deskripsi</th>
                  <th className="py-2 pr-4">Delta</th>
                  <th className="py-2 pr-4">Saldo Setelah</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0,10).map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{it.atWIB}</td>
                    <td className="py-2 pr-4">
                      {it.habit ? `Completed: ${it.habit.title}` :
                       it.reward ? `Claim: ${it.reward.name}` : it.reason}
                    </td>
                    <td className={`py-2 pr-4 ${it.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {it.delta >= 0 ? `+${it.delta}` : it.delta}
                    </td>
                    <td className="py-2 pr-4">{it.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
