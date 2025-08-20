// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from 'react';
import { getLedger, getHabitCompletions, getRewardClaims } from '../api/history';
import { getMeAndBalance } from '../api/user';

// util: yyyy-mm-dd untuk input[type=date]
function toYMD(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// skeleton baris
function SkeletonRow() {
  return <div className="animate-pulse rounded-xl bg-gray-100 h-16 w-full mb-3" />;
}

// badge sederhana
function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-md ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

// kartu ringkasan kecil
function SummaryCard({ title, value, sub }) {
  return (
    <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Profile() {
  const [tab, setTab] = useState('ledger'); // ledger | habits | rewards
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // user/account
  const [me, setMe] = useState({ username: '-', email: '-', badge: '-', pointBalance: 0 });

  // filter tanggal default: 7 hari terakhir
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  const [startDate, setStartDate] = useState(toYMD(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toYMD(today));

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // data
  const [ledger, setLedger] = useState({ items: [], summary: null });
  const [habits, setHabits] = useState({ items: [], summary: null });
  const [rewards, setRewards] = useState({ items: [] });

  // load account info
  useEffect(() => {
    (async () => {
      try {
        const res = await getMeAndBalance();
        setMe({
          username: res.username || '-',
          email: res.email || '-',
          badge: res.badge || '-',
          pointBalance: Number(res.pointBalance ?? res.balance ?? 0),
        });
      } catch (_) {
        // abaikan, tampil placeholder
      }
    })();
  }, []);

  // fetch data per tab
  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      if (tab === 'ledger') {
        const res = await getLedger({ page, limit, startDate, endDate });
        setLedger({ items: res.items || [], summary: res.summary || null });
        setTotal(res.total || 0);
      } else if (tab === 'habits') {
        const res = await getHabitCompletions({ page, limit, startDate, endDate });
        setHabits({ items: res.items || [], summary: res.summary || null });
        setTotal(res.total || 0);
      } else if (tab === 'rewards') {
        const res = await getRewardClaims({ page, limit, startDate, endDate });
        setRewards({ items: res.items || [] });
        setTotal(res.total || 0);
      }
    } catch (e) {
      setError(e?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [tab, page, startDate, endDate]);

  // Komponen list per tab
  const LedgerList = () => (
    <>
      {ledger.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard title="Starting Balance" value={ledger.summary.startingBalance} />
          <SummaryCard title="Credits" value={ledger.summary.credits} />
          <SummaryCard title="Debits" value={ledger.summary.debits} />
        </div>
      )}
      {loading ? (
        <>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
      ) : ledger.items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          Belum ada transaksi di rentang tanggal ini.
        </div>
      ) : (
        <div className="space-y-3">
          {ledger.items.map((it) => (
            <div key={it.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 text-gray-700">
                {it.type === 'habit' && '✅'}
                {it.type === 'reward' && '🎁'}
                {it.type === 'achievement' && '🏆'}
                {it.type === 'adjustment' && '⚙️'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {it.type === 'habit' && `Completed: ${it.habit?.title || '-'}`}
                    {it.type === 'reward' && `Claim: ${it.reward?.name || '-'}`}
                    {it.type === 'achievement' && (it.reason || 'Achievement')}
                    {it.type === 'adjustment' && (it.reason || 'Adjustment')}
                  </div>
                  {it.delta > 0 && <Badge tone="green">+{it.delta}</Badge>}
                  {it.delta < 0 && <Badge tone="red">{it.delta}</Badge>}
                </div>
                <div className="text-sm text-gray-500 mt-1">{it.atWIB}</div>
                {it.balanceAfter != null && (
                  <div className="text-xs text-gray-400 mt-1">Balance after: {it.balanceAfter}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const HabitsList = () => (
    <>
      {habits.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard title="Total Poin Didapat" value={habits.summary.totalPointsAwarded} />
          <SummaryCard title="Hari Aktif" value={habits.summary.daysActive} />
          <SummaryCard
            title="By Habit (Top)"
            value={habits.summary.byHabit?.[0]?.title || '-'}
            sub={habits.summary.byHabit?.[0] ? `${habits.summary.byHabit[0].count}x • ${habits.summary.byHabit[0].points} pts` : ''}
          />
        </div>
      )}
      {loading ? (
        <>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
      ) : habits.items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          Belum ada penyelesaian habit di rentang tanggal ini.
        </div>
      ) : (
        <div className="space-y-3">
          {habits.items.map((it) => (
            <div key={it.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.habit?.title || '-'}</div>
                <Badge tone="green">+{it.pointsAwarded} pts</Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">{it.completedAtWIB}</div>
              <div className="text-xs text-gray-400 mt-1">
                {it.achievement?.name ? `Achievement: ${it.achievement.name} (${it.achievement.frequency})` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const RewardsList = () => (
    <>
      {loading ? (
        <>
          <SkeletonRow /><SkeletonRow />
        </>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
      ) : rewards.items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          Belum ada klaim reward di rentang tanggal ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rewards.items.map((it) => (
            <div key={it.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{it.reward?.name || '-'}</div>
                <Badge tone="purple">-{it.cost} pts</Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">{it.claimedAtWIB}</div>
              <div className="text-xs text-gray-400 mt-1">Balance after: {it.balanceAfter}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
        <p className="text-gray-500">Akun & Riwayat aktivitas kamu</p>
      </div>

      {/* Account info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <SummaryCard title="Username" value={me.username} sub={me.email} />
        <SummaryCard title="Point Balance" value={me.pointBalance} sub={`Badge: ${me.badge || '-'}`} />
        <SummaryCard title="Mode" value="Personal" sub="History hanya milik kamu" />
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTab('ledger'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab==='ledger' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => { setTab('habits'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab==='habits' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Habit Completions
          </button>
          <button
            onClick={() => { setTab('rewards'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab==='rewards' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Reward Claims
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={startDate}
            onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={endDate}
            onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
          />
        </div>
      </div>

      {/* Content per tab */}
      <div>
        {tab === 'ledger' && <LedgerList />}
        {tab === 'habits' && <HabitsList />}
        {tab === 'rewards' && <RewardsList />}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">Page {page} / {totalPages}</div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`px-3 py-1.5 rounded-lg text-sm border ${page<=1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`px-3 py-1.5 rounded-lg text-sm border ${page>=totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
