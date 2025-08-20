// src/components/calendar/Calendar.jsx
import { useEffect, useMemo, useState, useRef } from "react";

/** ===== Helpers tanggal (start minggu = Senin) ===== */
function clone(d) { return new Date(d.getTime()); }
function startOfMonth(d) { const x = clone(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d) { const x = startOfMonth(d); x.setMonth(x.getMonth()+1); x.setDate(0); x.setHours(23,59,59,999); return x; }
function addDays(d, n) { const x = clone(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d, n) { const x = clone(d); x.setMonth(x.getMonth()+n); return x; }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

// YYYY-MM-DD pakai **waktu lokal browser**
function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}

// Senin=0..Minggu=6
function dayIndexMon0(d){ return (d.getDay()+6)%7; }

// Ambil Senin pada minggu tanggal d
function startOfWeekMon(d){
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const idx = dayIndexMon0(x);
  return addDays(x, -idx);
}

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS_SHORT = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const DAYS_ID = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

function formatDateID(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  const obj = new Date(y, m-1, d);
  const dayName = DAYS_ID[dayIndexMon0(obj)];
  return `${dayName}, ${d} ${MONTHS_ID[m-1]} ${y}`;
}

/**
 * Calendar (Tailwind) — versi vivid
 * Props:
 * - mode: 'daily' | 'weekly'
 * - value: Date
 * - onChange(date: Date)
 * - onPickDay(isoLocal: string)
 * - onPickWeek({startISO,endISO})
 * - badges: { [YYYY-MM-DD]: number }
 * - events: { [YYYY-MM-DD]: Array<{id, title, status, subtitle?}> }
 */
export default function Calendar({
  mode: initialMode = "daily",
  value: externalValue,
  onChange,
  onPickDay,
  onPickWeek,
  badges = {},
  events = {}
}) {
  const [mode, setMode] = useState(initialMode);

  // Sinkronisasi bila prop value berubah
  const [anchor, setAnchor] = useState(() => {
    const v = externalValue instanceof Date ? externalValue : new Date();
    v.setHours(0,0,0,0);
    return v;
  });
  useEffect(() => {
    if (externalValue instanceof Date) {
      const v = new Date(externalValue.getFullYear(), externalValue.getMonth(), externalValue.getDate());
      if (!isSameDay(v, anchor)) {
        setAnchor(v);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue?.getTime?.()]);

  const today = useMemo(() => {
    const t = new Date(); t.setHours(0,0,0,0); return t;
  }, []);

  const [openDayIso, setOpenDayIso] = useState(null);
  const containerRef = useRef(null);

  const shownMonth = useMemo(() => startOfMonth(anchor), [anchor]);
  const gridStart = startOfWeekMon(shownMonth);
  const gridEnd = useMemo(() => addDays(gridStart, 41), [gridStart]);

  const cells = useMemo(() => {
    const list = [];
    for (let i=0;i<42;i++) list.push(addDays(gridStart, i));
    return list;
  }, [gridStart]);

  const selectedWeekStart = useMemo(() => startOfWeekMon(anchor), [anchor]);
  const selectedWeekEnd = useMemo(() => addDays(selectedWeekStart, 6), [selectedWeekStart]);

  function gotoMonth(n){
    const next = addMonths(anchor, n);
    next.setDate(1); next.setHours(0,0,0,0);
    setAnchor(next); onChange?.(next);
  }
  function goToday(){
    const t = new Date(); t.setHours(0,0,0,0);
    setAnchor(t); onChange?.(t);
  }
  function pickDate(d){
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    setAnchor(x); onChange?.(x);
    const iso = dateKeyLocal(x);
    if (mode === "daily") {
      onPickDay?.(iso);
    } else {
      const ws = startOfWeekMon(x);
      const we = addDays(ws, 6);
      onPickWeek?.({ startISO: dateKeyLocal(ws), endISO: dateKeyLocal(we) });
    }
  }

  function badgeOf(d){
    const count = Number(badges[dateKeyLocal(d)] || 0);
    return count > 0 ? count : null;
  }
  function eventsOf(d){
    const arr = events[dateKeyLocal(d)];
    return Array.isArray(arr) ? arr : [];
  }

  const inSelectedWeek = (d) => d >= selectedWeekStart && d <= selectedWeekEnd;
  const inShownMonth = (d) => d.getMonth() === shownMonth.getMonth() && d.getFullYear() === shownMonth.getFullYear();
  const isWeekend = (d) => {
    const idx = dayIndexMon0(d);
    return idx === 5 || idx === 6; // Sab, Min
  };

  /** ===== Keyboard Navigation ===== */
  function onKeyDown(e) {
    let handled = true;
    if (e.key === 'ArrowLeft') setAnchor(a => { const x=addDays(a,-1); onChange?.(x); return x; });
    else if (e.key === 'ArrowRight') setAnchor(a => { const x=addDays(a,1); onChange?.(x); return x; });
    else if (e.key === 'ArrowUp') setAnchor(a => { const x=addDays(a,-7); onChange?.(x); return x; });
    else if (e.key === 'ArrowDown') setAnchor(a => { const x=addDays(a,7); onChange?.(x); return x; });
    else if (e.key === 'PageUp') gotoMonth(-1);
    else if (e.key === 'PageDown') gotoMonth(1);
    else if (e.key === 'Home') setAnchor(a => { const ws=startOfWeekMon(a); onChange?.(ws); return ws; });
    else if (e.key === 'End') setAnchor(a => { const ws=startOfWeekMon(a); const we=addDays(ws,6); onChange?.(we); return we; });
    else if (e.key.toLowerCase() === 't') goToday();
    else if (e.key === 'Enter' || e.key === ' ') pickDate(anchor);
    else handled = false;

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /** ===== Dropdown bulan/tahun ===== */
  const years = useMemo(() => {
    const cy = today.getFullYear();
    const arr = [];
    for (let y = cy - 5; y <= cy + 5; y++) arr.push(y);
    return arr;
  }, [today]);

  function onSelectMonth(mIndex) {
    const next = new Date(anchor.getFullYear(), Number(mIndex), 1);
    setAnchor(next); onChange?.(next);
  }
  function onSelectYear(y) {
    const next = new Date(Number(y), anchor.getMonth(), 1);
    setAnchor(next); onChange?.(next);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-200 bg-white"
      role="application"
      aria-label="Kalender"
      tabIndex={0}
      onKeyDown={onKeyDown}
      ref={containerRef}
    >
      {/* Toolbar (gradient, kontras tinggi) */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => gotoMonth(-1)}
              className="px-2 py-1.5 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
              aria-label="Bulan sebelumnya"
              title="Bulan sebelumnya"
            >
              ‹
            </button>

            {/* Bulan / Tahun */}
            <div className="flex items-center gap-2">
              <select
                className="text-sm bg-white/90 text-slate-800 border border-white/40 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/60"
                value={shownMonth.getMonth()}
                onChange={(e)=>onSelectMonth(e.target.value)}
                aria-label="Pilih bulan"
              >
                {MONTHS_ID.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                className="text-sm bg-white/90 text-slate-800 border border-white/40 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/60"
                value={shownMonth.getFullYear()}
                onChange={(e)=>onSelectYear(e.target.value)}
                aria-label="Pilih tahun"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button
              onClick={() => gotoMonth(1)}
              className="px-2 py-1.5 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
              aria-label="Bulan berikutnya"
              title="Bulan berikutnya"
            >
              ›
            </button>

            <button
              onClick={goToday}
              className="ml-1 px-3 py-1.5 rounded-lg bg-white text-indigo-700 font-medium shadow-sm hover:bg-white/90 text-sm"
              title="Loncat ke hari ini (T)"
            >
              Hari ini
            </button>
          </div>

          {/* Switch daily/weekly */}
          <div className="flex items-center gap-1 bg-white/15 rounded-lg p-1 self-start">
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition ${mode==='daily' ? 'bg-white text-indigo-700 shadow font-semibold' : 'text-white/90 hover:text-white'}`}
              onClick={() => setMode('daily')}
              aria-pressed={mode==='daily'}
            >
              Daily
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition ${mode==='weekly' ? 'bg-white text-indigo-700 shadow font-semibold' : 'text-white/90 hover:text-white'}`}
              onClick={() => setMode('weekly')}
              aria-pressed={mode==='weekly'}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Header hari */}
      <div className="px-4 md:px-6 pt-3">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-600">
          {DAYS_SHORT.map((d, i) => (
            <div key={d} className={`py-2 ${i>=5 ? 'text-rose-600' : ''}`}>{d}</div>
          ))}
        </div>
      </div>

      {/* Grid tanggal */}
      <div className="px-2 md:px-4 pb-4">
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, idx) => {
            const iso = dateKeyLocal(d);
            const isToday = isSameDay(d, today);
            const isSelectedDay = isSameDay(d, anchor);
            const outMonth = !inShownMonth(d);
            const inWeek = mode==='weekly' && inSelectedWeek(d);
            const weekend = isWeekend(d);
            const badge = badgeOf(d);
            const dayEvents = eventsOf(d);

            let cls = "relative min-h-[96px] rounded-xl cursor-pointer select-none border transition shadow-sm hover:shadow-md";
            if (inWeek) cls += " bg-indigo-50 border-indigo-200";
            else cls += " bg-white border-slate-200";
            if (isSelectedDay && mode==='daily') cls += " ring-2 ring-indigo-600";
            if (outMonth) cls += " bg-slate-50 text-slate-300";
            if (weekend && !outMonth) cls += " bg-rose-50/30";

            return (
              <div
                key={idx}
                className={cls}
                onClick={() => pickDate(d)}
                title={iso}
                role="button"
                aria-label={`${formatDateID(iso)}${badge ? `, ${badge} selesai` : ''}`}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isSelectedDay && mode==='daily' ? true : undefined}
              >
                {/* header tanggal */}
                <div className="flex items-center justify-between p-2">
                  <div className={`text-sm ${outMonth ? 'text-slate-300' : 'text-slate-800'} ${isToday ? 'font-bold' : 'font-medium'}`}>
                    {d.getDate()}
                  </div>
                  {/* badge count */}
                  {badge ? (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-indigo-600 text-white text-[11px] leading-[20px] px-1 shadow">
                      {badge}
                    </span>
                  ) : null}
                </div>

                {/* events (max 2) */}
                {dayEvents.length > 0 && (
                  <div className="px-2 pb-2 space-y-1">
                    {dayEvents.slice(0,2).map((ev,i) => {
                      const st = ev.status || 'done';
                      const pill =
                        st === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-indigo-600 text-white';
                      return (
                        <div key={(ev.id ?? ev.title) + '-' + i}
                             className={`truncate text-[11px] px-2 py-1 rounded-md shadow-sm ${pill}`}
                             title={ev.subtitle || ev.title}>
                          {ev.title}{ev.subtitle ? <span className="opacity-90"> — {ev.subtitle}</span> : null}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <button
                        className="text-[11px] text-indigo-700 hover:underline font-medium"
                        onClick={(e)=>{e.stopPropagation(); setOpenDayIso(iso);}}>
                        +{dayEvents.length - 2} lagi
                      </button>
                    )}
                  </div>
                )}

                {isToday ? (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal daftar event per hari */}
      {openDayIso && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50" onClick={() => setOpenDayIso(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl ring-1 ring-slate-200" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-slate-900">Aktivitas — {formatDateID(openDayIso)}</h4>
              <button onClick={()=>setOpenDayIso(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm">Tutup</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(events[openDayIso] || []).map((ev, i) => (
                <div key={(ev.id ?? ev.title) + '-' + i} className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-sm font-medium text-slate-800">
                    {ev.title}
                    {ev.status === 'pending' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white">pending</span>
                    )}
                  </div>
                  {ev.subtitle ? <div className="text-xs text-slate-500 mt-0.5">{ev.subtitle}</div> : null}
                </div>
              ))}
              {(!events[openDayIso] || events[openDayIso].length === 0) && (
                <div className="text-sm text-slate-600">Tidak ada aktivitas untuk hari ini.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 md:px-6 pb-4">
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-indigo-50 border border-indigo-200" /> <span>Minggu terpilih</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-rose-100 border border-rose-300" /> <span>Akhir pekan</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-indigo-600" /> <span>Hari ini</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-indigo-600 text-white">#</span> <span>Badge jumlah selesai</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-500" /> <span>Pill "pending"</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { startOfWeekMon, addDays, dateKeyLocal };
