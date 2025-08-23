
import API from "../utils/api";

function toMessage(err, fallback = "Terjadi kesalahan. Coba lagi.") {
  try {
    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  } catch {
    return fallback;
  }
}

/**
 * Ledger poin (jika backend memang menyediakan endpoint ini).
 * Akan 404 jika endpoint /history/ledger tidak ada.
 */
export async function getLedger({ page = 1, limit = 20, startDate, endDate, type } = {}) {
  try {
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (type) params.type = type;
    const { data } = await API.get("/history/ledger", { params });
    return data;
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat ledger"));
  }
}

/**
 * Riwayat penyelesaian habit (jika endpoint tersedia).
 * Akan 404 bila /history/habits belum diimplementasi.
 */
export async function getHabitCompletions({ page = 1, limit = 20, startDate, endDate, habitId, frequency } = {}) {
  try {
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (habitId) params.habitId = habitId;
    if (frequency) params.frequency = frequency;
    const { data } = await API.get("/history/habits", { params });
    return data;
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat riwayat habits"));
  }
}

/**
 * Riwayat klaim reward — RESMI → /rewards/history
 * Kembalian: { items: [...] } sesuai controller barumu.
 */
export async function getRewardClaims({ limit = 100 } = {}) {
  try {
    const { data } = await API.get("/rewards/history", { params: { limit } });
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat riwayat reward"));
  }
}
