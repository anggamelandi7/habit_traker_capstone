// src/pages/Achievements.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

/* ===== Helpers WIB / Period (local) ===== */
function wibYMD(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
function wibDateObj(ymd) {
  return new Date(`${ymd}T00:00:00+07:00`);
}
function wibWeekKey(ymd) {
  const d = wibDateObj(ymd);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + (3 - day));
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const diff = (thursday - jan4) / 86400000;
  const week = 1 + Math.floor((diff + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
function todayWIB() { return wibYMD(new Date()); }
function thisWeekWIB() { return wibWeekKey(todayWIB()); }

/* ===== Claim Guard (local anti-respawn) ===== */
const CLAIM_GUARD_KEY = 'claimGuard.v1';
function getClaimGuard() {
  try { return JSON.parse(localStorage.getItem(CLAIM_GUARD_KEY) || '{}'); }
  catch { return {}; }
}
function setClaimGuard(map) {
  localStorage.setItem(CLAIM_GUARD_KEY, JSON.stringify(map));
}
function makeNameKey(name) {
  return (name || '').toString().trim().toLowerCase();
}
function isClaimedThisPeriodByGuard(ach) {
  const guard = getClaimGuard();
  const key = makeNameKey(ach?.name);
  const rec = guard[key];
  if (!rec) return false;
  const freq = ach?.frequency;
  if (freq === 'Weekly') return rec.claimedW === thisWeekWIB();
  return rec.claimedD === todayWIB(); // default Daily
}

/* ===== UI kecil ===== */
function ProgressBar({ percent = 0 }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
function StatPill({ children, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

/* ===== Helper key nama untuk cross-check /rewards ===== */
function makeKeyFromName(name) {
  return (name || '').toString().trim().toLowerCase();
}

/* ===== API helpers (langsung via axios instance) ===== */
async function getAchievementsAPI() {
  const { data } = await API.get('/achievements');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}
async function createAchievementAPI(payload) {
  const { data } = await API.post('/achievements', payload);
  return data;
}
async function updateAchievementAPI(id, payload) {
  const { data } = await API.put(`/achievements/${id}`, payload);
  return data;
}
async function deleteAchievementAPI(id) {
  const { data } = await API.delete(`/achievements/${id}`);
  return data;
}
async function addHabitToAchievementAPI(achievementId, payload) {
  const { data } = await API.post(`/achievements/${achievementId}/habits`, payload);
  return data;
}
async function getRewardsAPI() {
  try {
    const { data } = await API.get('/rewards');
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

/* ===== Ikon & warna habit (auto dari judul) ===== */
function habitVisual(title = '') {
  const t = title.toLowerCase();
  const hit = (keys) => keys.some(k => t.includes(k));
  if (hit(['lari','jog','jogging','run'])) return { emoji: '🏃', color: 'indigo' };
  if (hit(['baca','read','book'])) return { emoji: '📚', color: 'amber' };
  if (hit(['meditasi','meditate','yoga'])) return { emoji: '🧘', color: 'emerald' };
  if (hit(['gym','workout','push up','plank','angkat beban'])) return { emoji: '💪', color: 'violet' };
  if (hit(['minum','air putih','drink water','hydrate'])) return { emoji: '💧', color: 'sky' };
  if (hit(['jalan','walk'])) return { emoji: '🚶', color: 'teal' };
  if (hit(['sepeda','gowes','cycle','bike'])) return { emoji: '🚴', color: 'lime' };
  if (hit(['renang','swim'])) return { emoji: '🏊', color: 'cyan' };
  if (hit(['tidur','sleep'])) return { emoji: '😴', color: 'slate' };
  if (hit(['makan sehat','diet','salad','buah','sayur'])) return { emoji: '🥗', color: 'green' };
  if (hit(['ngoding','coding','code','program'])) return { emoji: '💻', color: 'zinc' };
  if (hit(['tulis','write','jurnal','journal'])) return { emoji: '✍️', color: 'rose' };
  if (hit(['doa','shalat','pray'])) return { emoji: '🙏', color: 'amber' };
  return { emoji: '⭐', color: 'gray' };
}
const COLOR_STYLES = {
  indigo:  { bg:'bg-indigo-50',  text:'text-indigo-600',  chip:'bg-indigo-50 text-indigo-700 border-indigo-200',  ring:'ring-indigo-200' },
  amber:   { bg:'bg-amber-50',   text:'text-amber-600',   chip:'bg-amber-50 text-amber-700 border-amber-200',    ring:'ring-amber-200' },
  emerald: { bg:'bg-emerald-50', text:'text-emerald-600', chip:'bg-emerald-50 text-emerald-700 border-emerald-200', ring:'ring-emerald-200' },
  violet:  { bg:'bg-violet-50',  text:'text-violet-600',  chip:'bg-violet-50 text-violet-700 border-violet-200',  ring:'ring-violet-200' },
  sky:     { bg:'bg-sky-50',     text:'text-sky-600',     chip:'bg-sky-50 text-sky-700 border-sky-200',          ring:'ring-sky-200' },
  teal:    { bg:'bg-teal-50',    text:'text-teal-600',    chip:'bg-teal-50 text-teal-700 border-teal-200',       ring:'ring-teal-200' },
  lime:    { bg:'bg-lime-50',    text:'text-lime-700',    chip:'bg-lime-50 text-lime-700 border-lime-200',       ring:'ring-lime-200' },
  cyan:    { bg:'bg-cyan-50',    text:'text-cyan-700',    chip:'bg-cyan-50 text-cyan-700 border-cyan-200',       ring:'ring-cyan-200' },
  slate:   { bg:'bg-slate-50',   text:'text-slate-600',   chip:'bg-slate-50 text-slate-700 border-slate-200',    ring:'ring-slate-200' },
  green:   { bg:'bg-green-50',   text:'text-green-600',   chip:'bg-green-50 text-green-700 border-green-200',    ring:'ring-green-200' },
  zinc:    { bg:'bg-zinc-50',    text:'text-zinc-600',    chip:'bg-zinc-50 text-zinc-700 border-zinc-200',       ring:'ring-zinc-200' },
  rose:    { bg:'bg-rose-50',    text:'text-rose-600',    chip:'bg-rose-50 text-rose-700 border-rose-200',       ring:'ring-rose-200' },
  gray:    { bg:'bg-gray-50',    text:'text-gray-600',    chip:'bg-gray-50 text-gray-700 border-gray-200',       ring:'ring-gray-200' },
};

/* ===== Kartu Achievement ===== */
function AchievementCard({
  a,
  onAddHabit,
  onEditAchievement,
  onDeleteAchievement,
  onGoClaim,
  isClaimableByRewards,
  locked: lockedProp, // locked karena SUDAH KLAIM
}) {
  const [newHabit, setNewHabit] = useState({ title: '', pointsPerCompletion: '' });
  const [warn, setWarn] = useState(null);

  const totalHabitPoints = useMemo(
    () => (a.habits || []).reduce((sum, h) => sum + Number(h.pointsPerCompletion || 0), 0),
    [a.habits]
  );
  const remainingToTarget = Math.max(0, Number(a.targetPoints || 0) - totalHabitPoints);

  const percent = Number(a?.stats?.progressPercent ?? a?.progressPercent ?? a?.progress ?? 0);

  // === strict discipline awareness ===
  const status = a?.status || 'ACTIVE'; // ACTIVE | COMPLETED | EXPIRED
  const nowInWindow = a?.window?.nowInWindow ?? true; // backend listAchievements mengirim window.nowInWindow
  const isInactive = status !== 'ACTIVE' || !nowInWindow;

  const isExpired = status === 'EXPIRED';
  const isCompleted = status === 'COMPLETED';

  // Sudah diklaim (untuk cap "Sudah di-claim")
  const alreadyClaimedFlag =
    a?.stats?.alreadyClaimed === true ||
    a?.isClaimed === true ||
    !!a?.claimedAt ||
    a?.rewardStatus === 'claimed' ||
    isClaimedThisPeriodByGuard(a);

  // locked khusus “sudah di-claim”
  const locked = typeof lockedProp === 'boolean'
    ? lockedProp
    : alreadyClaimedFlag || (percent >= 100 && isClaimableByRewards === false);

  const canClaim = !isInactive && !locked && percent >= 100 && Number(a.targetPoints || 0) > 0;
  const windowEndWIB = a?.window?.validToWIB || a?.stats?.windowEndWIB;
  const windowStartWIB = a?.window?.validFromWIB || a?.stats?.windowStartWIB;

  useEffect(() => {
    const p = Number(newHabit.pointsPerCompletion || 0);
    if (!Number.isFinite(p)) return;
    setWarn(p > remainingToTarget ? `Poin habit melebihi target. Sisa slot: ${remainingToTarget}` : null);
  }, [newHabit.pointsPerCompletion, remainingToTarget]);

  return (
    <div className={`relative rounded-2xl p-6 shadow-lg transition ${
      isInactive ? 'bg-gray-100 border border-gray-300 opacity-90' : 'bg-gradient-to-br from-white to-gray-50'
    }`}>
      {/* STAMP CLAIMED */}
      {locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="select-none rotate-[-12deg] border-4 border-red-500 text-red-600 uppercase tracking-widest font-extrabold text-xl md:text-2xl px-5 py-2 rounded-lg bg-white/70 shadow">
            Sudah di claim
          </div>
        </div>
      )}

      {/* overlay status */}
      {isExpired && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="select-none rotate-[-6deg] border-4 border-amber-500 text-amber-700 uppercase tracking-widest font-extrabold text-lg md:text-xl px-4 py-1.5 rounded-lg bg-white/70 shadow">
            Kadaluarsa
          </div>
        </div>
      )}
      {isCompleted && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="select-none rotate-[6deg] border-4 border-emerald-600 text-emerald-700 uppercase tracking-widest font-extrabold text-lg md:text-xl px-4 py-1.5 rounded-lg bg-white/70 shadow">
            Selesai
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Info kiri */}
        <div className={`min-w-0 ${locked ? 'filter grayscale' : ''}`}>
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold truncate text-lg ${isInactive ? 'text-gray-700' : 'text-gray-900'}`}>
              {a.name}
            </h4>
            <StatPill tone="indigo">{a.frequency}</StatPill>
            {isExpired && <StatPill tone="amber">Expired</StatPill>}
            {isCompleted && <StatPill tone="green">Completed</StatPill>}
          </div>

          {/* Description ditampilkan */}
          {a?.description && (
            <p className="mt-1.5 text-sm text-gray-700">
              {a.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>🎯 Target: <span className="font-semibold">{a.targetPoints}</span> poin</span>
            <span>• 📈 Terkumpul: <span className="font-semibold">{a?.stats?.contributedPoints ?? 0}</span></span>
            <span>• ⏳ Sisa: <span className="font-semibold">{a?.stats?.remainingPoints ?? 0}</span></span>
          </div>

          {/* Info window — Daily vs Weekly */}
          {a.frequency === 'Daily' ? (
            <div className="mt-1 text-xs text-gray-600">
              Reset tiap 00:00 WIB • Window berakhir: <span className="font-medium">{windowEndWIB || '-'}</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-600">
              Berlaku 7 hari sejak dibuat: <span className="font-medium">{windowStartWIB || '-'}</span> — <span className="font-medium">{windowEndWIB || '-'}</span>
            </div>
          )}

          {isInactive && !locked && (
            <div className="mt-3 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Kartu ini <b>{isExpired ? 'expired' : 'tidak aktif'}</b>. Buat kartu baru untuk periode berjalan.
            </div>
          )}
          {locked && (
            <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              Achievement sudah <b>diklaim</b> pada periode aktif. Kartu terkunci — hanya dapat dihapus.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {locked ? (
            <button
              onClick={() => onDeleteAchievement(a)}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-red-50 text-red-600 border-red-300 transition"
              title="Hapus Achievement"
            >
              🗑️ Hapus
            </button>
          ) : (
            <>
              <button
                onClick={() => onEditAchievement(a)}
                disabled={isInactive}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  isInactive ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              : 'hover:bg-indigo-50 text-indigo-700 border-indigo-300'
                }`}
                title={isInactive ? 'Tidak bisa edit karena kartu tidak aktif' : 'Edit Achievement'}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => onDeleteAchievement(a)}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-red-50 text-red-600 border-red-300 transition"
                title="Hapus Achievement"
              >
                🗑️ Hapus
              </button>
              <button
                onClick={() => onGoClaim(a)}
                disabled={!canClaim}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  canClaim
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                title={canClaim ? 'Klaim di halaman Rewards' : (isInactive ? 'Tidak aktif' : 'Belum 100%')}
              >
                🎁 Klaim Rewards
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className={`mt-4 ${locked ? 'filter grayscale' : ''}`}>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold">{Math.round(percent)}%</span>
        </div>
        <ProgressBar percent={percent} />
      </div>

      {/* Habits — lebih colorful + ikon aktivitas */}
      <div className={`mt-5 ${locked ? 'filter grayscale' : ''}`}>
        <div className="text-sm font-medium text-gray-900 mb-2">Habits</div>
        {(!a.habits || a.habits.length === 0) ? (
          <div className="text-gray-500 text-sm italic">Belum ada habit.</div>
        ) : (
          <ul className="space-y-2">
            {a.habits.map(h => {
              const v = habitVisual(h.title);
              const styles = COLOR_STYLES[v.color] || COLOR_STYLES.gray;
              return (
                <li
                  key={h.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border ${styles.ring} bg-white/70`}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg grid place-items-center ${styles.bg} ${styles.text}`}>
                      {v.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {h.title}
                      </div>
                      <div className="text-xs text-gray-500">{a.frequency}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${styles.chip}`}>
                    +{h.pointsPerCompletion} poin
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add Habit */}
      <div className={`mt-5 ${locked ? 'filter grayscale' : ''}`}>
        <div className="text-sm text-gray-600">
          Alokasi habit: <span className="font-semibold">{totalHabitPoints}</span> / {a.targetPoints} poin
        </div>

        <div className={`mt-3 border rounded-xl p-3 ${isInactive || locked ? 'bg-gray-100' : 'bg-indigo-50/40'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Nama habit"
              value={newHabit.title}
              onChange={e => setNewHabit({ ...newHabit, title: e.target.value })}
              disabled={isInactive || locked}
            />
            <input
              type="number"
              min="0"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Poin"
              value={newHabit.pointsPerCompletion}
              onChange={e => setNewHabit({ ...newHabit, pointsPerCompletion: e.target.value })}
              disabled={isInactive || locked}
            />
            <button
              onClick={async () => {
                const p = Number(newHabit.pointsPerCompletion || 0);
                if (!newHabit.title?.trim()) return alert('Judul habit wajib diisi');
                if (Number.isNaN(p) || p <= 0) return alert('Poin harus angka > 0');
                if (p > remainingToTarget) return alert(`Poin habit melebihi target. Sisa slot: ${remainingToTarget}`);
                await onAddHabit(a, { title: newHabit.title.trim(), pointsPerCompletion: p });
                setNewHabit({ title: '', pointsPerCompletion: '' });
              }}
              disabled={
                isInactive || locked ||
                !newHabit.title?.trim() ||
                Number(newHabit.pointsPerCompletion || 0) <= 0 ||
                Number(newHabit.pointsPerCompletion || 0) > remainingToTarget
              }
              className={`px-3 py-2 rounded-lg text-sm transition ${
                isInactive || locked ||
                !newHabit.title?.trim() ||
                Number(newHabit.pointsPerCompletion || 0) <= 0 ||
                Number(newHabit.pointsPerCompletion || 0) > remainingToTarget
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              ➕ Simpan Habit
            </button>
          </div>
          {warn && <div className="mt-2 text-xs text-amber-700">{warn}</div>}
          {locked && (
            <div className="mt-2 text-xs text-emerald-700">
              Achievement sudah diklaim. Kartu terkunci — tidak bisa tambah/edit habit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Halaman utama ===== */
export default function Achievements() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // toggle sembunyikan kartu yang sudah diklaim (persist)
  const [hideClaimed, setHideClaimed] = useState(() => {
    const v = localStorage.getItem('hideClaimed');
    return v === '1';
  });
  useEffect(() => {
    localStorage.setItem('hideClaimed', hideClaimed ? '1' : '0');
  }, [hideClaimed]);

  // claimable rewards dari /rewards
  const [claimableMap, setClaimableMap] = useState({ byName: new Set(), bySourceId: new Set() });

  // edit modal
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', targetPoints: 0 });

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', frequency: 'Daily', targetPoints: '', description: '' });

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const achs = await getAchievementsAPI();

      const rewards = await getRewardsAPI();
      const byName = new Set(rewards.map(r => makeKeyFromName(r.name)));
      const bySourceId = new Set(rewards.map(r => r.sourceId).filter(Boolean));

      setItems(achs);
      setClaimableMap({ byName, bySourceId });
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat achievements');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Refresh saat balik ke tab / setelah klaim
  useEffect(() => {
    let t;
    const onClaimed = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setMsg('Reward baru diklaim — menyegarkan data…');
        load();
      }, 120);
    };
    const onFocus = () => {
      clearTimeout(t);
      t = setTimeout(() => load(), 60);
    };
    window.addEventListener('reward-claimed', onClaimed);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('reward-claimed', onClaimed);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const daily = useMemo(() => items.filter(a => a.frequency === 'Daily'), [items]);
  const weekly = useMemo(() => items.filter(a => a.frequency === 'Weekly'), [items]);

  /* ---- Helpers lock ---- */
  const isClaimableByRewards = (a) => {
    if (a.sourceId && claimableMap.bySourceId.has(a.sourceId)) return true;
    return claimableMap.byName.has(makeKeyFromName(a.name));
  };
  const getPercent = (a) => Number(a?.stats?.progressPercent ?? a?.progressPercent ?? a?.progress ?? 0);
  const isAlreadyClaimedFlag = (a) =>
    a?.stats?.alreadyClaimed === true || a?.isClaimed === true || !!a?.claimedAt || a?.rewardStatus === 'claimed' || isClaimedThisPeriodByGuard(a);
  const isLocked = (a) => isAlreadyClaimedFlag(a) || (getPercent(a) >= 100 && !isClaimableByRewards(a));

  /* ---- Handlers ---- */
  const handleAddHabit = async (ach, payload) => {
    try {
      await addHabitToAchievementAPI(ach.id, payload);
      await load();
      setMsg(`Habit "${payload.title}" ditambahkan ke "${ach.name}"`);
    } catch (e) {
      setMsg(e?.error || 'Gagal menambah habit');
    }
  };
  const handleEditAchievement = (ach) => {
    setEditItem(ach);
    setEditForm({ name: ach.name, targetPoints: ach.targetPoints });
  };
  const saveEdit = async () => {
    try {
      await updateAchievementAPI(editItem.id, {
        name: editForm.name,
        targetPoints: Number(editForm.targetPoints || 0),
      });
      setMsg('Achievement diperbarui');
      setEditItem(null);
      await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menyimpan perubahan');
    }
  };
  const handleDeleteAchievement = async (ach) => {
    if (!window.confirm(`Hapus achievement "${ach.name}"?`)) return;
    try {
      await deleteAchievementAPI(ach.id);
      setMsg('Achievement dihapus');
      await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menghapus achievement');
    }
  };

  const goToRewardsForClaim = () => nav('/rewards');

  const createAchievement = async () => {
    const name = createForm.name.trim();
    const frequency = createForm.frequency;
    const targetPoints = Number(createForm.targetPoints || 0);
    if (!name) return setMsg('Nama achievement wajib diisi');
    if (!['Daily','Weekly'].includes(frequency)) return setMsg('Frequency tidak valid');
    if (!Number.isFinite(targetPoints) || targetPoints <= 0) return setMsg('Target points harus angka > 0');

    try {
      await createAchievementAPI({ name, frequency, targetPoints, description: createForm.description || null });
      setShowCreate(false);
      setCreateForm({ name: '', frequency: 'Daily', targetPoints: '', description: '' });
      await load();
      setMsg(`Achievement "${name}" dibuat`);
    } catch (e) {
      setMsg(e?.error || 'Gagal membuat achievement');
    }
  };

  const emptyState = (text) => (
    <div className="text-gray-500 text-sm">
      {text}{' '}
      <button onClick={() => setShowCreate(true)} className="text-indigo-600 underline">
        Tambah Achievement
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Achievements</h2>
          <p className="text-gray-600 text-sm">
            Daily reset otomatis tiap 00:00 WIB. Weekly aktif selama 7 hari sejak kartu dibuat. Jika window berakhir dan progress &lt; 100%, kartu jadi <b>Expired</b>.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full hover:opacity-90 transition"
        >
          + Tambah Achievement
        </button>
      </div>

      {msg && <div className="p-2 border rounded bg-white text-sm shadow-sm">{msg}</div>}

      {loading ? (
        <div>Memuat…</div>
      ) : (
        <>
          {/* DAILY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Daily</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={hideClaimed}
                  onChange={(e) => setHideClaimed(e.target.checked)}
                />
                Sembunyikan yang sudah di-claim
              </label>
            </div>

            {daily.filter(a => !(hideClaimed && isLocked(a))).length === 0 ? (
              emptyState('Belum ada pencapaian harian.')
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {daily
                  .filter(a => !(hideClaimed && isLocked(a)))
                  .map(a => (
                    <AchievementCard
                      key={a.id}
                      a={a}
                      isClaimableByRewards={isClaimableByRewards(a)}
                      locked={isLocked(a)}
                      onAddHabit={handleAddHabit}
                      onEditAchievement={handleEditAchievement}
                      onDeleteAchievement={handleDeleteAchievement}
                      onGoClaim={goToRewardsForClaim}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* WEEKLY */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Weekly</h3>
            {weekly.filter(a => !(hideClaimed && isLocked(a))).length === 0 ? (
              emptyState('Belum ada pencapaian mingguan.')
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {weekly
                  .filter(a => !(hideClaimed && isLocked(a)))
                  .map(a => (
                    <AchievementCard
                      key={a.id}
                      a={a}
                      isClaimableByRewards={isClaimableByRewards(a)}
                      locked={isLocked(a)}
                      onAddHabit={handleAddHabit}
                      onEditAchievement={handleEditAchievement}
                      onDeleteAchievement={handleDeleteAchievement}
                      onGoClaim={goToRewardsForClaim}
                    />
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Edit */}
      {editItem && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-3">Edit Achievement</h4>
            <div className="space-y-3">
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nama achievement"
              />
              <input
                className="border rounded-lg px-3 py-2 w-full"
                type="number" min="0"
                value={editForm.targetPoints}
                onChange={e => setEditForm({ ...editForm, targetPoints: e.target.value })}
                placeholder="Target poin"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-3">Tambah Achievement</h4>
            <div className="space-y-3">
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Nama achievement (mis. Makan Steak)"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              />

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Frequency:</span>
                <div className="bg-gray-100 rounded-lg p-1">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm ${createForm.frequency==='Daily' ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
                    onClick={() => setCreateForm({ ...createForm, frequency: 'Daily' })}
                  >
                    Daily
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm ${createForm.frequency==='Weekly' ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
                    onClick={() => setCreateForm({ ...createForm, frequency: 'Weekly' })}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              <input
                className="border rounded-lg px-3 py-2 w-full"
                type="number" min="1"
                placeholder="Target points (mis. 100)"
                value={createForm.targetPoints}
                onChange={e => setCreateForm({ ...createForm, targetPoints: e.target.value })}
              />

              <textarea
                className="border rounded-lg px-3 py-2 w-full"
                rows={3}
                placeholder="Deskripsi (opsional)"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={createAchievement} className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90">
                Buat Achievement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
