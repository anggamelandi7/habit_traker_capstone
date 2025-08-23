
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import Calendar, { startOfWeekMon, addDays, dateKeyLocal } from '../components/calendar/Calendar';


const ILLUSTRATION_URL = '/images/habits.png';

/* ====== API helpers (langsung via axios instance) ====== */
async function getHabitsGroupedAPI() {
  const { data } = await API.get('/habits/grouped');
  return data;
}
async function completeHabitAPI(id) {
  const { data } = await API.post(`/habits/${id}/complete`);
  return data;
}
async function updateHabitAPI(id, payload) {
  const { data } = await API.put(`/habits/${id}`, payload);
  return data;
}
async function deleteHabitAPI(id) {
  const { data } = await API.delete(`/habits/${id}`);
  return data;
}

/** Ambil list achievements untuk membaca window Weekly (validFrom..validTo) */
async function getAchievementWindowsAPI() {
  try {
    const { data } = await API.get('/achievements'); // controller kita mengembalikan array
    const arr = Array.isArray(data) ? data :
      (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.rows) ? data.rows : []));
    const map = {};
    for (const a of arr) {
      if (a.frequency !== 'Weekly') continue;
      // Ambil window dari respons controller (listAchievements expose window.*)
      const vFrom = a?.window?.validFromUTC || a?.validFromUTC || null;
      const vTo = a?.window?.validToUTC || a?.validToUTC || null;
      if (!vFrom || !vTo) continue;
      map[a.id] = { validFromUTC: vFrom, validToUTC: vTo, status: a.status, isActive: a.isActive };
    }
    return map; // { [achievementId]: {validFromUTC, validToUTC, ...} }
  } catch {
    return {};
  }
}

// Ledger opsional (kalau endpoint tidak ada, kita fallback ke kosong agar tidak error)
async function getLedgerRangeAPI({ startDate, endDate, limit = 1000 }) {
  try {
    const { data } = await API.get('/points/ledger', { params: { startDate, endDate, limit } });
    return data || { items: [] };
  } catch {
    try {
      const { data } = await API.get('/ledger/range', { params: { startDate, endDate, limit } });
      return data || { items: [] };
    } catch {
      return { items: [] };
    }
  }
}

/* ========== Komponen kecil: Section daftar habits ========== */
function Section({ title, items, onCompleteClick, onEditClick, onDeleteClick, tone = 'indigo' }) {
  const total = items?.length || 0;
  const isDoneFn = (h) => h.status === 'done' || h.canComplete === false;
  const canCompleteFn = (h) => !!h.canComplete;
  const doneCount = (items || []).filter(isDoneFn).length;
  const pendingCount = (items || []).filter((h) => !isDoneFn(h) && canCompleteFn(h)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      {/* Judul + ringkasan */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{doneCount}</span> selesai •{' '}
            <span className="font-medium text-gray-900">{pendingCount}</span> pending
          </div>
        </div>
        {/* Progress bar ringkas */}
        <div className="w-40">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-2 rounded-full ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500 text-right">{pct}%</div>
        </div>
      </div>

      {/* Isi */}
      {(!items || items.length === 0) ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <div className="text-gray-800 font-medium text-base">Belum ada habit di bagian ini.</div>
          <div className="text-sm text-gray-600 mt-1">
            Tambah habit baru dari halaman <span className="font-medium">Achievements</span>.
          </div>

          {/* Ilustrasi untuk empty state */}
          <img
            src={ILLUSTRATION_URL}
            alt="Ilustrasi kebiasaan"
            className="mx-auto mt-4 w-40 h-auto opacity-95"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <Link
            to="/achievements"
            className="inline-flex items-center gap-2 mt-4 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            ➕ Buat dari Achievements
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((h) => {
            const isDone = isDoneFn(h);
            const canComplete = canCompleteFn(h);
            const showDeadlineNote = !isDone && !!h.periodEndWIB;

            return (
              <li
                key={h.id}
                className="flex items-start justify-between gap-4 border rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium truncate text-gray-900">{h.title}</div>
                    {/* status chip */}
                    {isDone ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✔ Selesai
                      </span>
                    ) : canComplete ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        ⏳ Belum
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        ✔ Terkunci
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-gray-700 flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                      +{h.pointsPerCompletion} poin
                    </span>
                    {h.achievementName && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                        🎯 {h.achievementName}
                      </span>
                    )}
                    {h.frequency && (
                      <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700">
                        🔁 {h.frequency}
                      </span>
                    )}
                    {h.lastCompletedAtWIB && (
                      <span className="text-emerald-700">✔ {h.lastCompletedAtWIB}</span>
                    )}
                  </div>

                  {showDeadlineNote && (
                    <div className="mt-1 text-xs space-y-0.5">
                      <div className="text-amber-600">
                        Selesaikan sebelum <span className="font-medium">{h.periodEndWIB}</span>
                      </div>
                      {h.achievementCreatedAtWIB && (
                        <div className="text-gray-500">
                          (Kartu dibuat: <span className="font-medium">{h.achievementCreatedAtWIB}</span>)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onEditClick(h)}
                    disabled={isDone}
                    className={`px-3 py-2 rounded-lg border text-sm transition
                      ${isDone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                    title={isDone ? 'Edit dinonaktifkan karena sudah selesai di periode ini' : 'Edit'}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onDeleteClick(h)}
                    className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 text-gray-700"
                    title="Hapus"
                  >
                    Hapus
                  </button>

                  {canComplete ? (
                    <button
                      onClick={() => onCompleteClick(h)}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                    >
                      Selesai
                    </button>
                  ) : (
                    <span className="px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm select-none">
                      ✔ Selesai
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ===== Helper tanggal ===== */

// key lokal dari Date/ISO → YYYY-MM-DD (sesuai browser)
function keyLocal(x) {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  return dateKeyLocal(d);
}

// key Asia/Jakarta dari timestamp UTC (ledger.atUTC)
function keyWIBFromUTC(utcISOString, tz = 'Asia/Jakarta') {
  const d = new Date(utcISOString);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const y = parts.find(p=>p.type==='year')?.value;
  const m = parts.find(p=>p.type==='month')?.value;
  const da = parts.find(p=>p.type==='day')?.value;
  return `${y}-${m}-${da}`; // YYYY-MM-DD (WIB)
}

/** Buat array key hari (WIB) dari rentang UTC [from..to] (inklusif) */
function daysBetweenToWIBKeys(fromUTC, toUTC) {
  try {
    const start = new Date(fromUTC);
    const end = new Date(toUTC);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const set = new Set();
    for (let t = new Date(start); t <= end; t.setUTCDate(t.getUTCDate() + 1)) {
      set.add(keyWIBFromUTC(t.toISOString()));
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

// hitung badge = jumlah event 'done' per hari dari peta events
function countDoneBadges(eventsMap = {}) {
  const out = {};
  for (const [dateKey, arr] of Object.entries(eventsMap)) {
    const n = (arr || []).filter(ev => ev.status === 'done').length;
    if (n > 0) out[dateKey] = n;
  }
  return out;
}

export default function Habits() {
  const [daily, setDaily] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [weeklyWindows, setWeeklyWindows] = useState({}); // {achievementId: {validFromUTC, validToUTC}}
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // kalender
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [badges, setBadges] = useState({}); // {'YYYY-MM-DD': number} selesai/hari
  const [events, setEvents] = useState({}); // {'YYYY-MM-DD': [{id,title,status}]}

  // modal
  const [confirmHabit, setConfirmHabit] = useState(null);
  const [editHabit, setEditHabit] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', pointsPerCompletion: 0 });

  const monthRange = useCallback((dateObj) => {
    const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const e = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
    const toIso = (d) => dateKeyLocal(d); // pakai key lokal
    return { start: toIso(s), end: toIso(e) };
  }, []);

  // DONE events dari ledger (pakai key WIB)
  function buildDoneEventsFromLedger(ledger) {
    const ev = {};
    for (const it of (ledger.items || [])) {
      if (!(it.delta > 0)) continue;
      if (!it.habit?.title) continue;
      const isoWIB = keyWIBFromUTC(it.atUTC);
      if (!isoWIB) continue;
      ev[isoWIB] = ev[isoWIB] || [];
      ev[isoWIB].push({ id: `${it.id}-${it.habit.id}`, title: it.habit.title, status: 'done' });
    }
    return ev;
  }

  /** DAILY pending → hanya pada tanggal yang dipilih (anchor) */
  function buildDailyPendingForSelection(anchorDateObj, dailyList) {
    const ev = {};
    const anchorISO = keyLocal(anchorDateObj);
    const dailyPending = (dailyList || []).filter(h => h.status === 'pending' && h.canComplete);
    if (dailyPending.length) {
      ev[anchorISO] = ev[anchorISO] || [];
      dailyPending.forEach(h => {
        ev[anchorISO].push({ id: `p-d-${h.id}`, title: h.title, status: 'pending', subtitle: 'Daily (pending)' });
      });
    }
    return ev;
  }

  /** WEEKLY pending → pada SEMUA hari di window kartu (validFrom..validTo) */
  function buildWeeklyPendingByWindows(weeklyList, windowsMap) {
    const ev = {};
    const weeklyPending = (weeklyList || []).filter(h => h.status === 'pending' && h.canComplete);
    for (const h of weeklyPending) {
      const win = windowsMap?.[h.achievementId];
      if (!win?.validFromUTC || !win?.validToUTC) continue;
      const days = daysBetweenToWIBKeys(win.validFromUTC, win.validToUTC);
      days.forEach(iso => {
        ev[iso] = ev[iso] || [];
        ev[iso].push({ id: `p-w-${h.id}-${iso}`, title: h.title, status: 'pending', subtitle: 'Weekly (pending)' });
      });
    }
    return ev;
  }

  function mergeEvents(a = {}, b = {}) {
    const out = { ...(a || {}) };
    for (const k of Object.keys(b || {})) out[k] = (out[k] || []).concat(b[k]);
    return out;
  }

  const rebuildCalendar = useCallback(async (anchorDateObj, dailyList, weeklyList, windowsMap) => {
    // 1) ledger bulan anchor (DONE) — opsional, aman kalau endpoint belum ada
    const { start, end } = monthRange(anchorDateObj);
    const ledger = await getLedgerRangeAPI({ startDate: start, endDate: end, limit: 1000 });
    const doneEv = buildDoneEventsFromLedger(ledger);

    // 2) pending
    const dailyPendingEv = buildDailyPendingForSelection(anchorDateObj, dailyList);
    let weeklyPendingEv;
    if (windowsMap && Object.keys(windowsMap).length > 0) {
      // gunakan window dari achievement
      weeklyPendingEv = buildWeeklyPendingByWindows(weeklyList, windowsMap);
    } else {
      // fallback lama: tandai 7 hari minggu anchor (Mon..Sun)
      weeklyPendingEv = {};
      const ws = startOfWeekMon(anchorDateObj);
      const weeklyPend = (weeklyList || []).filter(h => h.status === 'pending' && h.canComplete);
      for (let i=0;i<7;i++){
        const d = addDays(ws, i);
        const iso = keyLocal(d);
        if (weeklyPend.length) {
          weeklyPendingEv[iso] = weeklyPendingEv[iso] || [];
          weeklyPend.forEach(h => {
            weeklyPendingEv[iso].push({ id: `p-w-${h.id}-${iso}`, title: h.title, status: 'pending', subtitle: 'Weekly (pending)' });
          });
        }
      }
    }

    // 3) gabung & set badges dari merged
    const merged = mergeEvents(doneEv, mergeEvents(dailyPendingEv, weeklyPendingEv));
    setEvents(merged);
    setBadges(countDoneBadges(merged));
  }, [monthRange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1) habits grouped (untuk pending & status lock dari server)
      const habitsData = await getHabitsGroupedAPI();
      setDaily(habitsData.daily || []);
      setWeekly(habitsData.weekly || []);
      setMeta(habitsData.meta || null);

      // 2) ambil window weekly dari achievements
      const wins = await getAchievementWindowsAPI();
      setWeeklyWindows(wins);

      // 3) bangun kalender
      await rebuildCalendar(calendarDate, habitsData.daily, habitsData.weekly, wins);
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [calendarDate, rebuildCalendar]);

  useEffect(() => { load(); }, [load]);

  // refetch ledger + pending saat ganti tanggal di kalender (reuse windows yang sudah ada)
  async function handleCalendarChange(d) {
    setCalendarDate(d);
    try {
      await rebuildCalendar(d, daily, weekly, weeklyWindows);
    } catch {
      // optional
    }
  }

  const handleConfirmComplete = async () => {
    if (!confirmHabit) return;
    try {
      const res = await completeHabitAPI(confirmHabit.id);
      setMsg(
        `✔ ${confirmHabit.title} — +${res.addedPoints} poin. Total: ${res.newBalance}` +
        (res?.achievementProgress?.claimable ? ` • Pencapaian "${res.achievementProgress.achievementName}" bisa diklaim!` : '')
      );
      setConfirmHabit(null);
      await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menyelesaikan habit');
      setConfirmHabit(null);
      await load();
    }
  };

  const onEditClick = (h) => {
    setEditHabit(h);
    setEditForm({ title: h.title, pointsPerCompletion: h.pointsPerCompletion });
  };

  const onDeleteClick = async (h) => {
    if (!window.confirm(`Hapus habit "${h.title}"? (histori poin tidak dihapus)`)) return;
    try {
      await deleteHabitAPI(h.id);
      setMsg('Habit dihapus'); await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menghapus habit');
    }
  };

  const saveEdit = async () => {
    try {
      await updateHabitAPI(editHabit.id, {
        title: editForm.title,
        pointsPerCompletion: Number(editForm.pointsPerCompletion || 0),
      });
      setMsg('Habit diperbarui'); setEditHabit(null); await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menyimpan perubahan');
    }
  };

  // hitung ringkas untuk hero
  const dDone = daily.filter(h => h.status === 'done' || h.canComplete === false).length;
  const dTotal = daily.length;
  const wDone = weekly.filter(h => h.status === 'done' || h.canComplete === false).length;
  const wTotal = weekly.length;

  return (
    <div className="space-y-6">
      <Calendar
        mode="daily"
        value={calendarDate}
        onChange={handleCalendarChange}
        badges={badges}
        events={events}
        weekStart="today"
      />

      {/* ===== HERO dengan ilustrasi ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-white/10 blur-2xl" />

        <div className="grid md:grid-cols-5 gap-6 items-center p-6 md:p-8 relative">
          {/* Copy */}
          <div className="md:col-span-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Kelola & Selesaikan Habits</h2>
            <p className="mt-2 text-white/90">
              Pantau progres harian dan mingguanmu. Tambahkan kebiasaan baru dari{' '}
              <Link to="/achievements" className="underline decoration-white/60 underline-offset-2 hover:decoration-white">
                halaman Achievements
              </Link>.
            </p>

            {/* Ringkasan kecil */}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1">
                🗓️ Hari ini: <b>{dDone}</b> / {dTotal} selesai
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1">
                📅 Minggu ini: <b>{wDone}</b> / {wTotal} selesai
              </span>
              {meta?.daily?.endWIB && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1">
                  ⏱️ Daily s/d <b>{meta.daily.endWIB}</b>{' '}
                  {meta?.weekly?.endWIB ? <>• Weekly s/d <b>{meta.weekly.endWIB}</b></> : null}
                </span>
              )}
            </div>

            <div className="mt-4">
              <Link
                to="/achievements"
                className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 font-medium px-4 py-2 hover:bg-indigo-50"
              >
                ➕ Tambah habit dari Achievements
              </Link>
            </div>
          </div>

          {/* Ilustrasi */}
          <div className="md:col-span-2 flex items-center justify-center">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-0 rounded-2xl bg-white/10 blur-md" />
              <img
                src={ILLUSTRATION_URL}
                alt="Ilustrasi orang mencentang daftar kebiasaan"
                className="relative w-full h-auto object-contain drop-shadow-xl"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </div>

      {msg && <div className="p-2 border rounded text-sm bg-white shadow-sm">{msg}</div>}

      {loading ? (
        <div className="bg-white rounded-2xl p-6 shadow">Memuat…</div>
      ) : (
        <>
          <Section
            title="Habits hari ini"
            items={daily}
            onCompleteClick={setConfirmHabit}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            tone="indigo"
          />
          <Section
            title="Habits minggu ini"
            items={weekly}
            onCompleteClick={setConfirmHabit}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            tone="emerald"
          />
        </>
      )}

      {/* Modal konfirmasi selesai */}
      {confirmHabit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow">
            <h4 className="text-lg font-semibold mb-2">Konfirmasi</h4>
            <p className="text-gray-700">
              Apakah kamu yakin sudah menyelesaikan habit <span className="font-medium">"{confirmHabit.title}"</span>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmHabit(null)} className="px-4 py-2 rounded border">Belum</button>
              <button onClick={handleConfirmComplete} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Ya, Selesai</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit */}
      {editHabit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow">
            <h4 className="text-lg font-semibold mb-2">Edit Habit</h4>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-700">Judul</span>
                <input
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Poin per penyelesaian</span>
                <input
                  className="mt-1 border rounded px-3 py-2 w-full"
                  type="number" min="0"
                  value={editForm.pointsPerCompletion}
                  onChange={e => setEditForm({ ...editForm, pointsPerCompletion: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditHabit(null)} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
