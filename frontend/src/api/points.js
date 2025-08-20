// src/api/points.js
import { apiGet } from './client';

/**
 * Ambil ledger dalam rentang tanggal (YYYY-MM-DD) — UTC di server,
 * server kita sudah format WIB di field atWIB untuk tampilan, tapi
 * kita akan group pakai tanggal ISO (UTC) lalu disesuaikan.
 */
export async function getLedgerRange({ startDate, endDate, page = 1, limit = 500 }) {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }).toString();

  return apiGet(`/points/ledger?${qs}`);
}
