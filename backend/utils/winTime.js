// utils/wibTime.js
const HOUR = 60 * 60 * 1000;
const WIB_OFFSET = 7 * HOUR;

// Buat Date UTC dari komponen WIB (y-m-d hh:mm:ss)
function toUTCFromWIBParts({ y, m, d, hh=0, mm=0, ss=0, ms=0 }) {
  const local = new Date(y, m - 1, d, hh, mm, ss, ms);
  return new Date(local.getTime() - WIB_OFFSET);
}

// Rentang 1 hari WIB (00:00:00–23:59:59.999) → dalam UTC
function wibDayRangeUTC(nowUTC = new Date()) {
  const w = new Date(nowUTC.getTime() + WIB_OFFSET);
  const y = w.getFullYear(), m = w.getMonth() + 1, d = w.getDate();
  const startUTC = toUTCFromWIBParts({ y, m, d, hh:0,  mm:0,  ss:0,  ms:0 });
  const endUTC   = toUTCFromWIBParts({ y, m, d, hh:23, mm:59, ss:59, ms:999 });
  return { startUTC, endUTC, y, m, d };
}

// Rentang 1 minggu WIB (Senin 00:00 s/d Minggu 23:59) → dalam UTC
function wibWeekRangeUTC(nowUTC = new Date()) {
  const w = new Date(nowUTC.getTime() + WIB_OFFSET);
  const idxMon0 = (w.getDay() + 6) % 7; // Sen=0..Min=6
  const startWIB = new Date(w.getFullYear(), w.getMonth(), w.getDate() - idxMon0, 0,0,0,0);
  const endWIB   = new Date(startWIB.getFullYear(), startWIB.getMonth(), startWIB.getDate()+6, 23,59,59,999);
  const startUTC = new Date(startWIB.getTime() - WIB_OFFSET);
  const endUTC   = new Date(endWIB.getTime() - WIB_OFFSET);
  return { startUTC, endUTC, startWIB, endWIB };
}

function formatWIBFromUTC(utcDate) {
  const w = new Date(utcDate.getTime() + WIB_OFFSET);
  const two = (n)=>String(n).padStart(2,'0');
  return `${two(w.getDate())}-${two(w.getMonth()+1)}-${w.getFullYear()} ${two(w.getHours())}:${two(w.getMinutes())}`;
}

function nowUTC(){ return new Date(); }

module.exports = { toUTCFromWIBParts, wibDayRangeUTC, wibWeekRangeUTC, formatWIBFromUTC, nowUTC, WIB_OFFSET };
