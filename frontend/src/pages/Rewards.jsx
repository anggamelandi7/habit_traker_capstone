// src/pages/Rewards.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../utils/api';

/* ============ Helpers WIB & formatting ============ */
function fmtWIB(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}
function wibYMD(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}
function wibWeekKey(ymd) {
  const d = new Date(`${ymd}T00:00:00+07:00`);
  const day = (d.getUTCDay() + 6) % 7;
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + (3 - day));
  const year = thu.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const diff = (thu - jan4) / 86400000;
  const week = 1 + Math.floor((diff + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
const CLAIM_GUARD_KEY = 'claimGuard.v1';
const nameKey = (s) => (s || '').toString().trim().toLowerCase();

/* ============ Local guard (opsional UX cadangan) ============ */
function setGuard(name) {
  try {
    const map = JSON.parse(localStorage.getItem(CLAIM_GUARD_KEY) || '{}');
    const ymd = wibYMD(); const wk = wibWeekKey(ymd);
    map[nameKey(name)] = { claimedD: ymd, claimedW: wk, updatedAt: Date.now() };
    localStorage.setItem(CLAIM_GUARD_KEY, JSON.stringify(map));
  } catch {}
}

/* ============ API helpers ============ */
async function apiGetRewards() {
  const { data } = await API.get('/rewards');
  if (Array.isArray(data)) {
    // fallback bentuk lama (array)
    let balance = 0;
    try { const r = await API.get('/rewards/total'); balance = Number(r?.data?.balance || 0); } catch {}
    const items = data.map(r => {
      const req = Number(r.requiredPoints || 0);
      const already = (r.status || '').toLowerCase() === 'claimed' || r.isActive === false || !!r.claimedAt;
      const claimable = !already && balance >= req && (r.isActive ?? true);
      return { ...r, claimable, remainingPoints: Math.max(0, req - balance) };
    });
    return { items, balance };
  }
  return { items: Array.isArray(data?.items) ? data.items : [], balance: Number(data?.balance || 0) };
}
async function apiClaimReward(id) {
  const { data } = await API.post(`/rewards/${id}/claim`);
  return data;
}
async function apiGetHistory() {
  // semua reward user (aktif/nonaktif/claimed/expired)
  const { data } = await API.get('/rewards/user');
  return Array.isArray(data) ? data : [];
}

/* ============ Confetti (CSS-only) ============ */
function Confetti({ show = false, onDone }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!show) return;
    const colors = ['#6366f1','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#e879f9'];
    const arr = Array.from({ length: 70 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 120;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * (dist * 0.8);
      const rot = (Math.random() * 720 - 360) + 'deg';
      const dur = 700 + Math.random() * 900;
      const size = 6 + Math.random() * 6;
      const color = colors[i % colors.length];
      return { x, y, rot, dur, size, color, delay: Math.random() * 120 };
    });
    setPieces(arr);
    const t = setTimeout(() => onDone && onDone(), 1400);
    return () => clearTimeout(t);
  }, [show, onDone]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none flex items-start justify-center z-[60]">
      <div className="relative mt-20 w-[1px] h-[1px]">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-sm confetti-piece"
            style={{
              width: p.size, height: p.size,
              background: p.color,
              animationDuration: `${p.dur}ms`,
              animationDelay: `${p.delay}ms`,
              transform: `translate(0,0) rotate(0deg)`,
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--rot': p.rot,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ Small UI ============ */
function Progress({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 progress-anim"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function StatusPill({ status, isActive }) {
  const s = (status || '').toLowerCase();
  if (s === 'claimed') return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Claimed</span>;
  if (s === 'expired') return <span className="px-2 py-0.5 text-xs rounded-full bg-rose-50 text-rose-700 border border-rose-200">Expired</span>;
  if (isActive === false) return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">Inactive</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Active</span>;
}

/* ============ Card ============ */
function RewardCard({ r, onClaim, claiming }) {
  const required = Number(r.requiredPoints || 0);
  const remaining = Number(r.remainingPoints ?? Math.max(0, required));
  const progress = required > 0 ? Math.round(((required - remaining) / required) * 100) : 0;
  const canClaim = !!r.claimable && (r.isActive ?? true);

  return (
    <div className="rounded-2xl p-5 bg-white shadow hover:shadow-md transition transform fadein-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{r.name}</h4>
            {canClaim ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">Pending</span>
            )}
          </div>
          {r.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.description}</p>}
        </div>
        <div className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-indigo-50 text-indigo-600 animate-pop">🎁</div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Target: <span className="font-medium">{required}</span> • Sisa: <span className="font-medium">{remaining}</span>
        </div>
        <button
          disabled={!canClaim || claiming}
          onClick={() => onClaim(r)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition claim-btn ${
            canClaim && !claiming ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {claiming ? 'Mengklaim…' : canClaim ? 'Klaim' : 'Terkunci'}
        </button>
      </div>
    </div>
  );
}

/* ============ History Row ============ */
function HistoryItem({ item }) {
  const required = Number(item.requiredPoints || 0);
  const status = (item.status || (item.isActive ? 'available' : 'inactive')).toLowerCase();
  return (
    <div className="rounded-xl p-4 bg-white border hover:shadow-sm transition flex items-start justify-between gap-3 fadein-up">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900 truncate">{item.name}</div>
          <StatusPill status={status} isActive={item.isActive} />
        </div>
        {item.description && <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.description}</div>}
        <div className="text-xs text-gray-500 mt-1">
          Target: <b>{required}</b>
          {item.claimedAt && <> • Diklaim: <b>{fmtWIB(item.claimedAt)}</b></>}
          {item.expiryDate && <> • Kedaluwarsa: <b>{fmtWIB(item.expiryDate)}</b></>}
        </div>
      </div>
      <div className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-gray-50">🏷️</div>
    </div>
  );
}

/* ============ Halaman utama ============ */
export default function Rewards() {
  const [tab, setTab] = useState('available'); // 'available' | 'history'
  const [items, setItems] = useState([]);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [toast, setToast] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [search, setSearch] = useState('');
  const [histFilter, setHistFilter] = useState('all'); // all|claimed|expired|inactive

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const { items, balance } = await apiGetRewards();
      setItems(Array.isArray(items) ? items : []);
      setBalance(Number(balance) || 0);
    } catch {
      setToast('Gagal memuat rewards');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const rows = await apiGetHistory();
      // urutkan: claimedAt desc -> createdAt desc
      rows.sort((a, b) => {
        const ca = new Date(a.claimedAt || 0).getTime();
        const cb = new Date(b.claimedAt || 0).getTime();
        if (cb !== ca) return cb - ca;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      setHistory(rows);
    } catch {
      setToast('Gagal memuat riwayat');
    } finally {
      setLoadingHist(false);
    }
  }, []);

  useEffect(() => { fetchRewards(); fetchHistory(); }, [fetchRewards, fetchHistory]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (items || []).filter(r => r.claimable === true && (r.isActive ?? true));
    if (!q) return base;
    return base.filter(r => r.name?.toLowerCase().includes(q));
  }, [items, search]);

  const visibleHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = Array.isArray(history) ? history.slice() : [];
    if (histFilter !== 'all') {
      list = list.filter(it => {
        const st = (it.status || (it.isActive ? 'available' : 'inactive')).toLowerCase();
        if (histFilter === 'claimed') return st === 'claimed';
        if (histFilter === 'expired') return st === 'expired';
        if (histFilter === 'inactive') return it.isActive === false && st !== 'claimed';
        return true;
      });
    }
    if (!q) return list;
    return list.filter(r => r.name?.toLowerCase().includes(q));
  }, [history, search, histFilter]);

  const onClaim = async (r) => {
    try {
      setClaimingId(r.id);
      const res = await apiClaimReward(r.id);
      setGuard(r.name);
      window.dispatchEvent(new CustomEvent('reward-claimed', { detail: { id: r.id, name: r.name } }));
      setToast('Reward berhasil diklaim! 🎉');
      setShowConfetti(true);
      if (typeof res?.balance !== 'undefined') setBalance(Number(res.balance) || 0);
      // refresh isi & history setelah animasi
      setTimeout(async () => {
        await fetchRewards();
        await fetchHistory();
        setShowConfetti(false);
      }, 1000);
    } catch (e) {
      setToast(e?.response?.data?.error || 'Gagal klaim reward');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* CSS for animations */}
      <style>{`
        @keyframes fadeUp { from { opacity:.0; transform: translateY(8px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }
        .fadein-up { animation: fadeUp .45s ease both; }
        .progress-anim { transition: width .5s ease; }
        @keyframes pop { 0%{ transform: scale(1); } 50%{ transform: scale(1.08); } 100%{ transform: scale(1); } }
        .animate-pop { animation: pop 1.4s ease-in-out infinite; }
        @keyframes pulseBorder { 0%{ box-shadow: 0 0 0 0 rgba(99,102,241,.5);} 70%{ box-shadow: 0 0 0 8px rgba(99,102,241,0);} 100%{ box-shadow: 0 0 0 0 rgba(99,102,241,0);} }
        .claim-btn:hover { animation: pulseBorder 1.2s ease-out; }
        @keyframes confettiFly { to { transform: translate(var(--x), var(--y)) rotate(var(--rot)); opacity: 0; } }
        .confetti-piece { animation-name: confettiFly; animation-timing-function: cubic-bezier(.2,.6,.2,1); }
      `}</style>

      {toast && (
        <div className="fixed top-4 right-4 z-[70] px-4 py-2 rounded bg-gray-900 text-white shadow fadein-up">
          {toast}
        </div>
      )}
      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-5 md:p-6 flex items-start md:items-center justify-between gap-4 fadein-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 grid place-items-center text-indigo-600 animate-pop">🏆</div>
          <div>
            <div className="text-sm text-gray-500">Total Poin Kamu</div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{balance}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              className="border rounded-xl px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Cari reward…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute right-2 top-2.5 text-gray-400">🔎</span>
          </div>
          <button
            onClick={() => { setSearch(''); fetchRewards(); fetchHistory(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50"
            title="Refresh"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow p-2 flex items-center gap-2 w-full md:w-auto fadein-up">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab==='available' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
          onClick={() => setTab('available')}
        >
          Bisa Diklaim
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab==='history' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
          onClick={() => setTab('history')}
        >
          Riwayat
        </button>
      </div>

      {/* Content */}
      {tab === 'available' ? (
        <div>
          {loading ? (
            <div className="text-gray-600">Memuat…</div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-gray-600 bg-white fadein-up">
              <div className="text-lg font-medium">Tidak ada reward yang bisa diklaim saat ini</div>
              <div className="text-sm mt-1">Selesaikan pencapaian hingga 100% untuk membuka reward.</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {visibleItems.map((r, idx) => (
                <div key={r.id} style={{ animationDelay: `${idx * 60}ms` }}>
                  <RewardCard r={r} onClaim={onClaim} claiming={claimingId === r.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={histFilter}
              onChange={e => setHistFilter(e.target.value)}
            >
              <option value="all">Semua</option>
              <option value="claimed">Claimed</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loadingHist ? (
            <div className="text-gray-600">Memuat riwayat…</div>
          ) : visibleHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-gray-600 bg-white fadein-up">
              Belum ada riwayat.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {visibleHistory.map((it, idx) => (
                <div key={`${it.id}-${idx}`} style={{ animationDelay: `${idx * 40}ms` }}>
                  <HistoryItem item={it} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
