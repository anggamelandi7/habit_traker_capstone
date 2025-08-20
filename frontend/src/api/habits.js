
// Wrapper API untuk fitur Habits (monitor & kelola).
// Mengandalkan helper di ./client (apiGet, apiPost, apiPut, apiDel).

import { apiGet, apiPost, apiPut, apiDel } from './client';

/**
 * Ambil daftar habits (flat).
 * Disediakan agar kompatibel dengan kode lama (Dashboard/Stats).
 */
export const getHabits = () => apiGet('/habits');

/** Ambil habits terkelompok { daily: [...], weekly: [...] } */
export const getHabitsGrouped = () => apiGet('/habits?grouped=true');

/** Tandai habit selesai (anti-cheat per-periode di server). */
export const completeHabit = (id) => apiPost(`/habits/${id}/complete`);

/** Edit habit (title / pointsPerCompletion / achievementId). */
export const updateHabit = (id, payload) => apiPut(`/habits/${id}`, payload);

/** Hapus habit (soft delete). */
export const deleteHabitAPI = (id) => apiDel(`/habits/${id}`);

// Util opsional untuk normalisasi error
export function getApiError(err, fallback = 'Terjadi kesalahan') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.error) return err.error;
  if (err.detail) return err.detail;
  if (err.message) return err.message;
  return fallback;
}
