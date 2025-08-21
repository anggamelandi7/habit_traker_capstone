// src/pages/Stats.jsx
import { useEffect, useMemo, useState } from 'react';
import API from '../utils/api';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

/* ================= Helpers WIB ================= */
const TZ = 'Asia/Jakarta';

function fmtDateWIB(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}
function labelDayMonthWIB(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: '2-digit'
  }).format(new Date(iso));
}
function ymdWIB(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}
function addDays(dateLike, n) {
  const d = new Date(dateLike);
  d.setDate(d.getDate() + n);
  return d;
}
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* =============== Detektor jenis transaksi =============== */
function isCompletionTx(it) {
  const deltaPos = num(it?.delta) > 0;
  const refType = (it?.refType || '').toString().toLowerCase();
  const reason = (it?.reason || '').toString().toLowerCase();

  // jika backend menaruh objek habit → itu jelas completion
  if (deltaPos && it?.habit) return true;

  // pola umum di backend-mu:
  // - refType: 'Habit' | 'HabitCompletion'
  // - reason: 'habit_completion' | 'complete_habit' | dll
  if (deltaPos && (refType === 'habit' || refType === 'habitcompletion')) return true;
  if (deltaPos && /habit/.test(reason) && (/complete|completion|selesai/.test(reason) || !/bonus|reward|claim/.test(reason))) return true;

  return false;
}

function isClaimTx(it) {
  const deltaNeg = num(it?.delta) < 0;
  const refType = (it?.refType || '').toString().toLowerCase();
  const reason = (it?.reason || '').toString().toLowerCase();

  // jika backend menaruh objek reward → itu jelas claim
  if (deltaNeg && it?.reward) return true;

  // pola umum:
  // - refType: 'Reward'
  // - reason: 'claim_reward' | 'reward_claim'
  if (deltaNeg && refType === 'reward') return true;
  if (deltaNeg && (/claim/.test(reason) || /reward/.test(reason))) return true;

  return false;
}

function describeTx(it) {
  if (it?.habit?.title) return `Completed: ${it.habit.title}`;
  if (it?.reward?.name) return `Claim: ${it.reward.name}`;
  if (isCompletionTx(it)) return 'Completed habit';
  if (isClaimTx(it)) return 'Claim reward';
  return it?.reason || '-';
}

/* ================= API ================= */
async function fetchUser() {
  const { data } = await API.get('/users/me');
  return data || null;
}

// Ledger: prioritas /points/ledger, fallback /ledger/range → /ledger
async function fetchLedgerRange({ startDate, endDate, limit = 1000 }) {
  try {
    const { data } = await API.get('/points/ledger', { params: { startDate, endDate, limit } });
    return data || { items: [] };
  } catch {
    try {
      const { data } = await API.get('/ledger/range', { params: { startDate, endDate, limit } });
      return data || { items: [] };
    } catch {
      try {
        const { data } = await API.get('/ledger', { params: { limit } });
        return data || { items: [] };
      } catch {
        return { items: [] };
      }
    }
  }
}

// Balance: dari /rewards ({ balance }) → fallback /rewards/total
async function fetchBalance() {
  try {
    const { data } = await API.get('/rewards');
    if (data && typeof data.balance !== 'undefined') return Number(data.balance || 0);
  } catch { /* ignore */ }
  try {
    const { data } = await API.get('/rewards/total');
    if (data && typeof data.balance !== 'undefined') return Number(data.balance || 0);
  } catch { /* ignore */ }
  return 0;
}

// Habits distribusi Daily/Weekly
async function fetchHabitsGrouped() {
  try {
    const { data } = await API.get('/habits/grouped');
    if (data && (Array.isArray(data.daily) || Array.isArray(data.weekly))) return data;
  } catch { /* ignore */ }
  try {
    const { data } = await API.get('/habits');
    const arr = Array.isArray(data) ? data : [];
    const daily = arr.filter(h => (h.frequency || 'Daily') === 'Daily');
    const weekly = arr.filter(h => (h.frequency || 'Weekly') === 'Weekly');
    return { daily, weekly };
  } catch {
    return { daily: [], weekly: [] };
  }
}

/* ================= Komponen ================= */
export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30); // 7 | 30 | 90
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState({ items: [] });
  const [habitsGrouped, setHabitsGrouped] = useState({ daily: [], weekly: [] });
  const [error, setError] = useState(null);

  // fetch data
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // rentang WIB
        const end = new Date();
        const start = addDays(end, -rangeDays + 1);
        const startDate = ymdWIB(start);
        const endDate = ymdWIB(end);

        const [me, bal, ledgerRes, hg] = await Promise.all([
          fetchUser(),
          fetchBalance(),
          fetchLedgerRange({ startDate, endDate, limit: 2000 }),
          fetchHabitsGrouped(),
        ]);
        if (!mounted) return;

        setUsername(me?.username || me?.email || '');
        setBalance(bal);

        // Normalisasi ledger items: atWIB, id, delta, balanceAfter
        const items = Array.isArray(ledgerRes?.items) ? ledgerRes.items.map((it, idx) => {
          const atUTC = it.atUTC || it.at || it.createdAt || new Date().toISOString();
          return {
            ...it,
            id: it.id ?? `ldg-${idx}`,
            atUTC,
            atWIB: it.atWIB || fmtDateWIB(atUTC),
            delta: num(it.delta),
            balanceAfter: num(it.balanceAfter, it.balanceAfter),
          };
        }) : [];

        // urutkan terbaru → lama
        items.sort((a, b) => new Date(b.atUTC || 0) - new Date(a.atUTC || 0));
        setLedger({ items });

        setHabitsGrouped({
          daily: Array.isArray(hg.daily) ? hg.daily : [],
          weekly: Array.isArray(hg.weekly) ? hg.weekly : [],
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || 'Gagal memuat statistik');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [rangeDays]);

  const items = ledger.items || [];

  /* ===================== KPI ===================== */
  const kpi = useMemo(() => {
    const totalHabits = (habitsGrouped.daily?.length || 0) + (habitsGrouped.weekly?.length || 0);
    const completions = items.filter(isCompletionTx).length;
    const claims = items.filter(isClaimTx).length;
    return { totalHabits, completions, claims, balance };
  }, [habitsGrouped, items, balance]);

  /* ========== Grafik: Completion Harian (range terpilih) ========== */
  const dailyCompletionData = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (isCompletionTx(it)) {
        const lbl = labelDayMonthWIB(it.atUTC);
        map.set(lbl, (map.get(lbl) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([date, completed]) => ({ date, completed }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  /* ========== Grafik: Tren Saldo Poin (nilai terakhir per hari) ========== */
  const balanceTrend = useMemo(() => {
    const arr = [...items].reverse().map(it => ({
      date: labelDayMonthWIB(it.atUTC),
      balance: num(it.balanceAfter),
    }));
    const map = new Map();
    for (const x of arr) map.set(x.date, x.balance);
    return Array.from(map.entries()).map(([date, balance]) => ({ date, balance }));
  }, [items]);

  /* ========== Distribusi Habit: Daily vs Weekly ========== */
  const habitFreq = useMemo(() => ([
    { type: 'Daily', count: habitsGrouped.daily?.length || 0 },
    { type: 'Weekly', count: habitsGrouped.weekly?.length || 0 },
  ]), [habitsGrouped]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-16 bg-white/70 rounded-2xl" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i)=>(<div key={i} className="h-24 bg-white/70 rounded-2xl animate-pulse" />))}
        </div>
        <div className="h-80 bg-white/70 rounded-2xl animate-pulse" />
        <div className="h-80 bg-white/70 rounded-2xl animate-pulse" />
        <div className="h-72 bg-white/70 rounded-2xl animate-pulse" />
        <div className="h-72 bg-white/70 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ====== STYLE kecil untuk animasi ====== */}
      <style>{`
        @keyframes floaty { 0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)} }
        .floaty { animation: floaty 3.2s ease-in-out infinite; }
      `}</style>

      {/* ====== Header ====== */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm opacity-90">Halo{username ? `, ${username}` : ''} 👋</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistik & Performa</h1>
            <p className="opacity-90 mt-1 text-sm">
              Lihat progres kebiasaan, riwayat poin, dan tren performamu dalam satu tempat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/90">Rentang:</span>
            <div className="bg-white/15 rounded-lg p-1">
              {[7,30,90].map(n => (
                <button
                  key={n}
                  onClick={() => setRangeDays(n)}
                  className={`px-3 py-1.5 rounded-md text-sm ${rangeDays===n ? 'bg-white text-indigo-700 font-medium' : 'text-white/90 hover:bg-white/10'}`}
                  title={`Lihat ${n} hari terakhir`}
                >
                  {n}H
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====== KPI ====== */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Habits</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpi.totalHabits}</div>
            <div className="floaty text-xl">🧩</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Completion</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-3xl font-semibold text-emerald-600">{kpi.completions}</div>
            <div className="floaty text-xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Total Claims</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-3xl font-semibold text-indigo-600">{kpi.claims}</div>
            <div className="floaty text-xl">🎁</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-gray-500 text-sm">Saldo Poin</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpi.balance}</div>
            <div className="floaty text-xl">💎</div>
          </div>
        </div>
      </div>

      {/* ====== Completion Harian (Bar) ====== */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Completion Harian (WIB)</h2>
          <div className="text-sm text-gray-500">Sumber: Ledger (+delta, habit completion) • {rangeDays} hari terakhir</div>
        </div>
        {dailyCompletionData.length === 0 ? (
          <div className="text-gray-500">Belum ada completion yang terekam.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ====== Tren Saldo Poin (Line) ====== */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tren Saldo Poin</h2>
          <div className="text-sm text-gray-500">Sumber: Ledger (balanceAfter) • {rangeDays} hari terakhir</div>
        </div>
        {balanceTrend.length === 0 ? (
          <div className="text-gray-500">Belum ada mutasi poin.</div>
        ) : (
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
        )}
      </div>

      {/* ====== Distribusi Frekuensi Habit ====== */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Distribusi Frekuensi Habit</h2>
        </div>
        {(habitFreq[0].count + habitFreq[1].count) === 0 ? (
          <div className="text-gray-500">Belum ada habit.</div>
        ) : (
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
        )}
      </div>

      {/* ====== Riwayat (10 terbaru) ====== */}
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
                {items.slice(0, 10).map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{it.atWIB || fmtDateWIB(it.atUTC)}</td>
                    <td className="py-2 pr-4">{describeTx(it)}</td>
                    <td className={`py-2 pr-4 ${num(it.delta) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {num(it.delta) >= 0 ? `+${num(it.delta)}` : num(it.delta)}
                    </td>
                    <td className="py-2 pr-4">{num(it.balanceAfter) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
