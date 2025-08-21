// backend/utils/period.js

/**
 * Utility perhitungan periode (WIB) untuk Achievements
 * - Daily  : window = hari ini (00:00–23:59 WIB)
 * - Weekly : window = 7 hari sejak tanggal dibuatnya kartu (createdAt) dalam WIB
 *
 * Kompat:
 *   getCurrentWindowWIB(arg)
 *     - arg: 'Daily' | 'Weekly' (fallback lama; Weekly pakai "hari ini" sebagai base)
 *     - arg: { frequency: 'Daily'|'Weekly', createdAt?: string|Date } (lebih akurat)
 */

const TZ = 'Asia/Jakarta';

/* ========== Format & Tanggal WIB ========== */

/** Format WIB ringkas: DD/MM/YYYY • HH.mm */
function fmtWIB(d) {
  if (!d) return null;
  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(':', '.');
  return `${datePart} • ${timePart}`;
}

/** YYYY-MM-DD pada WIB */
function ymdWIB(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** WIB start of day */
function wibStartOfDay(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  const ymd = ymdWIB(d);
  // +07:00 agar konsisten WIB
  return new Date(`${ymd}T00:00:00.000+07:00`);
}

/** WIB end of day */
function wibEndOfDay(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  const ymd = ymdWIB(d);
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

/** Tambah hari pada domain UTC (stabil untuk pergeseran harian) */
function addDaysUTC(dateLike, n) {
  const d = new Date(dateLike);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/* ========== Window Per Achievement ========== */

function normalizeArg(arg) {
  // pemanggilan lama: getCurrentWindowWIB('Weekly')
  if (typeof arg === 'string') {
    return { frequency: String(arg), baseDate: new Date() }; // Weekly pakai "hari ini" bila createdAt tak tersedia
  }
  // pemanggilan baru: getCurrentWindowWIB(achievementObj)
  const frequency = arg?.frequency || 'Daily';
  const baseDate = arg?.createdAt ? new Date(arg.createdAt) : new Date();
  return { frequency, baseDate };
}

/**
 * Hitung window berjalan (WIB).
 * - Weekly: 7 hari sejak baseDate (createdAt jika tersedia).
 * - Daily : tanggal hari ini (WIB).
 * return: { periodStart, periodEnd, nowInWindow }
 */
function getCurrentWindowWIB(arg = 'Daily') {
  const { frequency, baseDate } = normalizeArg(arg);
  const f = String(frequency).toLowerCase();

  if (f === 'weekly') {
    const start = wibStartOfDay(baseDate);               // WIB
    const end = wibEndOfDay(addDaysUTC(start, 6));       // inklusif 7 hari (0..6)
    const now = new Date();
    return {
      periodStart: start,
      periodEnd: end,
      nowInWindow: now >= start && now <= end,
    };
  }

  // default: Daily
  const start = wibStartOfDay(new Date());
  const end = wibEndOfDay(new Date());
  return {
    periodStart: start,
    periodEnd: end,
    nowInWindow: true,
  };
}

/**
 * Metadata window (WIB) untuk tampilan UI & FE:
 *  {
 *    startWIB, endWIB,                   // string human readable
 *    validFromUTC, validToUTC,           // untuk FE logic rentang (ISO)
 *    validFromWIB, validToWIB,           // string sama dg start/end WIB
 *    nowInWindow                         // boolean
 *  }
 */
function getWindowMetaWIB(arg = 'Daily') {
  const { periodStart, periodEnd, nowInWindow } = getCurrentWindowWIB(arg);
  return {
    startWIB: fmtWIB(periodStart),
    endWIB: fmtWIB(periodEnd),
    validFromUTC: periodStart.toISOString(),
    validToUTC: periodEnd.toISOString(),
    validFromWIB: fmtWIB(periodStart),
    validToWIB: fmtWIB(periodEnd),
    nowInWindow,
  };
}

module.exports = {
  // formatters & date utils
  fmtWIB,
  ymdWIB,
  wibStartOfDay,
  wibEndOfDay,
  addDaysUTC,

  // window
  getCurrentWindowWIB,
  getWindowMetaWIB,
};
