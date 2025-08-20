// src/pages/Habits.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHabitsGrouped, completeHabit, updateHabit, deleteHabitAPI } from '../api/habits';
import { getLedgerRange } from '../api/points';
import Calendar, { startOfWeekMon, addDays, dateKeyLocal } from '../components/calendar/Calendar';

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
          <div className="text-3xl mb-1">🗓️</div>
          <div className="text-gray-700 font-medium">Belum ada habit di bagian ini.</div>
          <div className="text-sm text-gray-600 mt-1">
            Tambah habit baru dari halaman <span className="font-medium">Achievements</span>.
          </div>
          <Link
            to="/achievements"
            className="inline-flex items-center gap-2 mt-3 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
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

  function monthRange(dateObj) {
    const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const e = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
    const toIso = (d) => dateKeyLocal(d); // pakai key lokal
    return { start: toIso(s), end: toIso(e) };
  }

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

  // PENDING events untuk tanggal/minggu terpilih (pakai key lokal)
  function buildPendingEventsForSelection(anchorDateObj, dailyList, weeklyList) {
    const ev = {};
    // DAILY (pending) → pada TANGGAL TERPILIH
    const anchorISO = keyLocal(anchorDateObj);
    const dailyPending = (dailyList || []).filter(h => h.status === 'pending' && h.canComplete);
    if (dailyPending.length) {
      ev[anchorISO] = ev[anchorISO] || [];
      dailyPending.forEach(h => {
        ev[anchorISO].push({ id: `p-d-${h.id}`, title: h.title, status: 'pending', subtitle: 'Daily (pending)' });
      });
    }
    // WEEKLY (pending) → SETIAP HARI minggu terpilih (Mon..Sun)
    const ws = startOfWeekMon(anchorDateObj);
    for (let i=0;i<7;i++){
      const d = addDays(ws, i);
      const iso = keyLocal(d);
      const weeklyPending = (weeklyList || []).filter(h => h.status === 'pending' && h.canComplete);
      if (weeklyPending.length) {
        ev[iso] = ev[iso] || [];
        weeklyPending.forEach(h => {
          ev[iso].push({ id: `p-w-${h.id}-${iso}`, title: h.title, status: 'pending', subtitle: 'Weekly (pending)' });
        });
      }
    }
    return ev;
  }

  function mergeEvents(a = {}, b = {}) {
    const out = { ...(a || {}) };
    for (const k of Object.keys(b || {})) out[k] = (out[k] || []).concat(b[k]);
    return out;
  }

  const load = async () => {
    setLoading(true);
    try {
      // 1) habits grouped (untuk pending)
      const habitsData = await getHabitsGrouped();
      setDaily(habitsData.daily || []);
      setWeekly(habitsData.weekly || []);
      setMeta(habitsData.meta || null);

      // 2) ledger bulan anchor (DONE)
      const { start, end } = monthRange(calendarDate);
      const ledger = await getLedgerRange({ startDate: start, endDate: end, limit: 1000 });
      const doneEv = buildDoneEventsFromLedger(ledger);

      // 3) pending utk anchor (daily+weekly)
      const pendingEv = buildPendingEventsForSelection(calendarDate, habitsData.daily, habitsData.weekly);

      // 4) gabung & set badges dari merged
      const merged = mergeEvents(doneEv, pendingEv);
      setEvents(merged);
      setBadges(countDoneBadges(merged));
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // refetch ledger + pending saat ganti bulan/tanggal di kalender
  async function handleCalendarChange(d) {
    setCalendarDate(d);
    try {
      const { start, end } = monthRange(d);
      const ledger = await getLedgerRange({ startDate: start, endDate: end, limit: 1000 });
      const doneEv = buildDoneEventsFromLedger(ledger);
      const pendingEv = buildPendingEventsForSelection(d, daily, weekly);
      const merged = mergeEvents(doneEv, pendingEv);
      setEvents(merged);
      setBadges(countDoneBadges(merged));
    } catch {
      // optional: toast
    }
  }

  const handleConfirmComplete = async () => {
    if (!confirmHabit) return;
    try {
      const res = await completeHabit(confirmHabit.id);
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
      await updateHabit(editHabit.id, {
        title: editForm.title,
        pointsPerCompletion: Number(editForm.pointsPerCompletion || 0),
      });
      setMsg('Habit diperbarui'); setEditHabit(null); await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal menyimpan perubahan');
    }
  };

  // hitung ringkas untuk subheader
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
      />

      {/* Info ringkas + CTA */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900">Habits (Monitor & Kelola)</h2>
        <p className="text-gray-600 text-sm">
          Lihat dan selesaikan habit harian/mingguanmu. Tambah habit dilakukan dari halaman <span className="font-medium">Achievements</span>.
        </p>
        {meta?.daily?.endWIB && (
          <p className="text-gray-500 text-xs mt-2">
            Periode aktif (WIB): Daily s/d <span className="font-medium">{meta.daily.endWIB}</span> • Weekly s/d <span className="font-medium">{meta.weekly?.endWIB || '-'}</span>
          </p>
        )}
        {/* Ringkasan kecil */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-indigo-700">
            🗓️ Hari ini: <b>{dDone}</b> / {dTotal} selesai
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-emerald-700">
            📅 Minggu ini: <b>{wDone}</b> / {wTotal} selesai
          </span>
          <Link
            to="/achievements"
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            ➕ Tambah habit dari Achievements
          </Link>
        </div>
      </div>

      {msg && <div className="p-2 border rounded text-sm bg-white shadow-sm">{msg}</div>}

      {loading ? (
        <div>Memuat…</div>
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
