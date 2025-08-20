// backend/helpers/period.js

/**
 * Format tanggal ke WIB ringkas: DD/MM/YYYY • HH.mm AM/PM
 */
function fmtWIB(d) {
  if (!d) return null;
  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // “AM/PM”
  })
    .format(d)
    .replace(':', '.'); // 12:00 -> 12.00

  return `${datePart} • ${timePart}`;
}

/**
 * Mengembalikan window aktif (WIB):
 *  - Daily : hari ini 00:00:00 s/d besok 00:00:00
 *  - Weekly: Senin 00:00:00 s/d Senin berikutnya 00:00:00
 * Return: { periodStart: Date(UTC), periodEnd: Date(UTC) }
 */
function getCurrentWindowWIB(frequency = 'Daily') {
  const tz = 'Asia/Jakarta';
  // “now” dalam zona WIB lalu dijadikan Date lokal
  const nowWIB = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));

  const start = new Date(nowWIB);
  const end = new Date(nowWIB);

  if (frequency === 'Weekly') {
    // Minggu dimulai Senin (Mon=1 .. Sun=7)
    const day = start.getDay() || 7; // getDay(): Sun=0 -> kita jadikan 7
    start.setDate(start.getDate() - (day - 1)); // mundur ke Senin
    start.setHours(0, 0, 0, 0);

    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
  } else {
    // Daily
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 1);
  }

  // Kembalikan sebagai Date UTC yang stabil
  return {
    periodStart: new Date(start.toISOString()),
    periodEnd: new Date(end.toISOString()),
  };
}

/**
 * Metadata window (WIB) untuk tampilan UI.
 * Return: { startWIB: string, endWIB: string }
 */
function getWindowMetaWIB(frequency = 'Daily') {
  const { periodStart, periodEnd } = getCurrentWindowWIB(frequency);
  return {
    startWIB: fmtWIB(periodStart),
    endWIB: fmtWIB(periodEnd),
  };
}

module.exports = { fmtWIB, getCurrentWindowWIB, getWindowMetaWIB };
