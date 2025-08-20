import { useEffect, useMemo, useState, useCallback } from 'react';
import { Gift, RefreshCcw, Trophy, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRewards, claimReward } from '../api/rewards';

/* =======================
   WIB helpers & Claim Guard
   ======================= */
function wibYMD(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // YYYY-MM-DD
}
function wibWeekKey(ymd) {
  const d = new Date(`${ymd}T00:00:00+07:00`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + (3 - day));
  const year = thu.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const diff = (thu - jan4) / 86400000;
  const week = 1 + Math.floor((diff + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
const CLAIM_GUARD_KEY = 'claimGuard.v1';
const makeNameKey = (s) => (s || '').toString().trim().toLowerCase();
function appendClaimGuardByName(name) {
  try {
    const map = JSON.parse(localStorage.getItem(CLAIM_GUARD_KEY) || '{}');
    const ymd = wibYMD();
    const wk = wibWeekKey(ymd);
    map[makeNameKey(name)] = { claimedD: ymd, claimedW: wk, updatedAt: Date.now() };
    localStorage.setItem(CLAIM_GUARD_KEY, JSON.stringify(map));
  } catch {}
}

/* =======================
   Mini Toast
   ======================= */
function Toast({ notice, onClose }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [notice, onClose]);
  if (!notice) return null;

  const { type = 'info', text = '' } = notice;
  const cls =
    type === 'error'
      ? 'bg-red-600 text-white'
      : type === 'success'
      ? 'bg-emerald-600 text-white'
      : 'bg-gray-900 text-white';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${cls}`}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}

/* =======================
   Pop SFX + Confetti
   ======================= */
function usePop() {
  return useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(440, ctx.currentTime);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.16);
    } catch {}
  }, []);
}
function ConfettiBurst({ show }) {
  const pieces = 14;
  const emojis = ['🎉', '✨', '🎊', '💥', '🌟', '🥳'];
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
          {Array.from({ length: pieces }).map((_, i) => {
            const delay = i * 0.02;
            const dx = (Math.random() - 0.5) * 300;
            const dy = -80 - Math.random() * 200;
            const rot = (Math.random() - 0.5) * 180;
            const scale = 0.8 + Math.random() * 0.7;
            const emoji = emojis[i % emojis.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, x: 0, rotate: 0, scale: 0.6 }}
                animate={{ opacity: 1, x: dx, y: dy, rotate: rot, scale }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 12, delay, duration: 0.6 }}
                className="text-3xl"
              >
                {emoji}
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

/* =======================
   Reward Card
   ======================= */
function RewardCard({ r, onClaim }) {
  const required = Number(r.requiredPoints ?? r.required_points ?? 0);
  const remaining = Number(
    r.remainingPoints ?? r.remaining_points ?? Math.max(0, required - (r.earnedPoints ?? 0))
  );
  const progress = required > 0 ? Math.round(((required - remaining) / required) * 100) : 0;
  const canClaim = !!r.claimable && (r.isActive ?? true);

  return (
    <div className="rounded-2xl p-5 bg-white shadow hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{r.name}</h4>
            {canClaim ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">
                <Sparkles size={14} /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                Pending
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.description}</p>
        </div>
        <div className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-indigo-50 text-indigo-600">
          <Gift size={20} />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Target: <span className="font-medium">{required}</span> • Sisa:{' '}
          <span className="font-medium">{remaining}</span>
        </div>
        <button
          disabled={!canClaim}
          onClick={() => onClaim(r)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            canClaim
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canClaim ? 'Klaim' : 'Terkunci'}
        </button>
      </div>
    </div>
  );
}

/* =======================
   Page
   ======================= */
export default function Rewards() {
  const [items, setItems] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [burst, setBurst] = useState(false);
  const pop = usePop();

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const { items, balance } = await getRewards();
      setItems(Array.isArray(items) ? items : []);
      setBalance(Number(balance) || 0);
    } catch (e) {
      setNotice({ type: 'error', text: 'Gagal memuat rewards' });
      console.error('GET /rewards failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const visibleItems = useMemo(() => {
    // tampilkan yang bisa diklaim dan aktif
    return items.filter((r) => r.claimable === true && (r.isActive ?? true));
  }, [items]);

  const handleClaim = async (r) => {
    // optimistic remove
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== r.id));
    setBurst(true);
    pop();

    try {
      const res = await claimReward(r.id);

      // Guard lokal + broadcast ke halaman Achievements
      appendClaimGuardByName(r.name);
      window.dispatchEvent(new CustomEvent('reward-claimed', { detail: { name: r.name, id: r.id } }));

      setNotice({ type: 'success', text: 'Reward berhasil diklaim!' });
      sessionStorage.setItem('justClaimed', '1');
      
      if (res && typeof res.balance !== 'undefined') {
        setBalance(Number(res.balance) || 0);
      }

      // refetch singkat agar sinkron
      setTimeout(fetchRewards, 400);
    } catch (e) {
      console.error('CLAIM failed:', e);
      setNotice({ type: 'error', text: 'Gagal klaim reward' });
      // rollback
      setItems(prev);
    } finally {
      setTimeout(() => setBurst(false), 450);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <Toast notice={notice} onClose={() => setNotice(null)} />
      <ConfettiBurst show={burst} />

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 grid place-items-center text-indigo-600">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Poin Kamu</div>
            <div className="text-2xl font-bold text-gray-900">{balance}</div>
          </div>
        </div>
        <button
          onClick={fetchRewards}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
          title="Refresh"
        >
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Memuat…</div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-gray-600 bg-white">
          <div className="flex items-center justify-center gap-2 font-medium">
            <CheckCircle size={18} className="text-emerald-600" />
            Tidak ada reward yang bisa diklaim saat ini
          </div>
          <div className="text-sm mt-1">Selesaikan pencapaian hingga 100% untuk membuka reward.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibleItems.map((r) => (
            <RewardCard key={r.id} r={r} onClaim={handleClaim} />
          ))}
        </div>
      )}
    </div>
  );
}
