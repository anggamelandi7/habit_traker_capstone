// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHabits } from '../api/habits';
import { getRewards } from '../api/rewards';
import API from '../utils/api';

const HERO_DESKTOP = '/images/dashboard-page.png';
const HERO_MOBILE  = '/images/dashboard-page.png';

/* ====== WIB helpers (cek “hari ini” secara robust) ====== */
function wibYMD(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
const TODAY_WIB = wibYMD();

/* Cek apakah habit selesai “hari ini”. */
function isDoneToday(h) {
  const boolKeys = ['doneToday', 'completedToday', 'isCompletedToday', 'isDoneToday', 'todayDone'];
  for (const k of boolKeys) {
    if (h?.hasOwnProperty(k)) return Boolean(h[k]);
  }
  const dateKeys = ['doneAt', 'completedAt', 'lastCompletedAt', 'lastDoneAt', 'lastCheckInAt'];
  for (const k of dateKeys) {
    const v = h?.[k];
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d) && wibYMD(d) === TODAY_WIB) return true;
  }
  const lists = [h?.completions, h?.completionDates, h?.doneDates, h?.history].filter(Boolean);
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const val = typeof item === 'string' ? item : (item?.date || item?.at || item?.completedAt);
      if (!val) continue;
      const d = new Date(val);
      if (!isNaN(d) && wibYMD(d) === TODAY_WIB) return true;
    }
  }
  return null;
}

/* Hitung pending + apakah perhitungannya “reliable” */
function countPendingTodayInfo(habits) {
  if (!Array.isArray(habits) || habits.length === 0) return { pending: 0, reliable: true };
  let known = 0;
  let undone = 0;
  for (const h of habits) {
    const d = isDoneToday(h);
    if (d === null) continue;
    known++;
    if (!d) undone++;
  }
  if (known > 0) return { pending: undone, reliable: true };
  return { pending: 0, reliable: false };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [points, setPoints] = useState(0);
  const [hasClaimable, setHasClaimable] = useState(false);
  const [msg, setMsg] = useState('');

  // “baru saja klaim” → tampilkan CTA target baru
  const [justClaimed, setJustClaimed] = useState(
    () => sessionStorage.getItem('justClaimed') === '1'
  );

  // username untuk sapaan (boleh preload dari localStorage, tapi SELALU akan dioverride dari server)
  const [username, setUsername] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      return u?.username || u?.name || '';
    } catch { return ''; }
  });

  const { pending, reliable } = useMemo(() => countPendingTodayInfo(habits), [habits]);
  const isNewUser = useMemo(
    () => (habits?.length || 0) === 0 && (points || 0) <= 0,
    [habits, points]
  );

  // >>> Perbaikan utama: SELALU refresh profil terbaru dari server
  async function fetchMe() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data: me } = await API.get('/users/me');
      const name = me?.username || me?.name || me?.email?.split('@')[0] || '';
      if (name) setUsername(name);
      try { localStorage.setItem('user', JSON.stringify(me)); } catch {}
    } catch {
      // diamkan; kalau 401 akan di-handle di load()
    }
  }

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      // Ambil profil TERBARU dari server (override localStorage lama seperti "angga88")
      await fetchMe();

      const hs = await getHabits();
      setHabits(Array.isArray(hs) ? hs : []);

      const rewardsRes = await getRewards(); // { balance, items: [...] }
      const balance = Number(rewardsRes?.balance || 0);
      setPoints(balance);
      const claimables = (rewardsRes?.items || []).filter((r) => r?.claimable);
      setHasClaimable(claimables.length > 0);
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat dashboard.');
      if (e?.status === 401 || e?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onClaimed = () => {
      setJustClaimed(true);
      sessionStorage.setItem('justClaimed', '1');
    };
    window.addEventListener('reward-claimed', onClaimed);
    return () => window.removeEventListener('reward-claimed', onClaimed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearJustClaimed = () => {
    setJustClaimed(false);
    sessionStorage.removeItem('justClaimed');
  };

  if (loading) return null;

  const showWelcomeCTA = isNewUser || justClaimed;

  return (
    <div className="space-y-6">
      {msg && (
        <div className="mb-1 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
          {msg}
        </div>
      )}

      {/* ======= HERO ======= */}
      <section
        className="relative overflow-hidden rounded-3xl shadow-sm"
        style={{
          background:
            'linear-gradient(120deg, rgba(99,102,241,0.10), rgba(168,85,247,0.10))',
        }}
      >
        <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-indigo-200/40" />

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* TEKS */}
          <div className="p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" /> Halaman utama
            </div>

            {showWelcomeCTA ? (
              <>
                <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  {isNewUser ? 'Selamat datang' : 'Selamat'}{username ? `, ${username}` : ''}! 🎉
                </h1>
                <p className="mt-2 text-gray-700">
                  {isNewUser
                    ? 'Susun pencapaian, tambah kebiasaan, kumpulkan poin, lalu klaim hadiahnya.'
                    : 'Reward berhasil diklaim! Saatnya set target baru dan lanjutkan kebiasaan baikmu.'}
                </p>

                <ul className="mt-5 space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-semibold">1</span>
                    <span><b>Buat Pencapaian</b> dengan target poin.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-semibold">2</span>
                    <span><b>Tambah Habit</b> yang mendukung target.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-semibold">3</span>
                    <span><b>Kumpulkan poin</b> dan <b>klaim reward</b> 🎁</span>
                  </li>
                </ul>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/achievements"
                    onClick={clearJustClaimed}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 font-semibold text-white shadow-md hover:opacity-95"
                  >
                    🚀 Buat Pencapaian
                  </Link>
                  <Link
                    to="/habits"
                    onClick={clearJustClaimed}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 backdrop-blur px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    ➕ Tambah Habit
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Halo{username ? `, ${username}` : ''}! 👋
                </h1>
                <p className="mt-2 text-gray-700">
                  {reliable ? (
                    pending > 0 ? (
                      <>Kamu punya <b>{pending}</b> habit yang <b>belum selesai hari ini</b>. Yuk lanjutkan!</>
                    ) : (
                      <>Mantap! Semua habit hari ini selesai. Lanjutkan streak-mu 🚀</>
                    )
                  ) : (
                    <>Yuk cek daftar habitmu hari ini dan lanjutkan streak! ✅</>
                  )}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/habits"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 font-semibold text-white shadow-md hover:opacity-95"
                  >
                    ✅ Buka Habits
                  </Link>

                  <Link
                    to="/rewards"
                    className={
                      hasClaimable
                        ? 'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-md hover:opacity-95'
                        : 'inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 backdrop-blur px-5 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50'
                    }
                    title={hasClaimable ? 'Ada reward siap diklaim — buka halaman Rewards' : 'Buka halaman Rewards'}
                  >
                    {hasClaimable ? '🎁 Klaim di Rewards' : '🎯 Lihat Rewards'}
                  </Link>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-gray-700">
                    🧩 Total Habit: <b>{habits.length}</b>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-gray-700">
                    ⭐ Poin: <b>{points}</b>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* GAMBAR — object-contain, tidak terpotong */}
          <div className="relative min-h-[260px] lg:min-h-[380px] xl:min-h-[440px]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(800px 500px at 60% 50%, rgba(99,102,241,.20), transparent 60%)',
              }}
            />
            <picture>
              <source media="(max-width: 1023px)" srcSet={HERO_MOBILE} />
              <img
                src={HERO_DESKTOP}
                alt="Ilustrasi kebiasaan personal"
                className="absolute inset-0 h-full w-full object-contain p-6 lg:p-10"
                draggable="false"
              />
            </picture>
          </div>
        </div>
      </section>

      {/* SECTION RINGAN */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Tips cepat</h3>
          <ul className="mt-3 list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Buat <b>Daily</b> habit kecil agar konsisten.</li>
            <li>Gabungkan beberapa habit dalam satu <b>Achievement</b> untuk target besar.</li>
            <li>Cek <b>Rewards</b> untuk motivasi tambahan.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Aksi cepat</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/achievements" onClick={clearJustClaimed} className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-indigo-700 hover:bg-indigo-50">
              + Pencapaian
            </Link>
            <Link to="/habits" onClick={clearJustClaimed} className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-indigo-700 hover:bg-indigo-50">
              + Habit
            </Link>
            <Link to="/rewards" className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2 text-emerald-700 hover:bg-emerald-50">
              Lihat Rewards
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
