// Client wrapper untuk endpoint rewards.
// Menggunakan instance axios dari src/utils/api (sudah ada auth header via interceptor)

import API from "../utils/api";

function toMessage(err, fallback = "Terjadi kesalahan. Coba lagi.") {
  try {
    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  } catch (_) {
    return fallback;
  }
}

/** Ambil rewards -> { items, balance } */
export async function getRewards() {
  try {
    const { data } = await API.get("/rewards");
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : [];
    const balance = typeof data?.balance === "number" ? data.balance : null;
    return { items, balance };
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat rewards"));
  }
}

/** Klaim reward by id (dengan idempotency sederhana) */
export async function claimReward(rewardId, payload = {}) {
  try {
    const key = `${rewardId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const { data } = await API.post(`/rewards/${rewardId}/claim`, payload, {
      headers: { "x-idempotency-key": key },
    });
    return data; // { message, balance, reward }
  } catch (err) {
    throw new Error(toMessage(err, "Gagal klaim reward"));
  }
}

/** Ringkasan saldo (opsional) */
export async function getPointSummary() {
  try {
    const { data } = await API.get("/rewards/total"); // disesuaikan agar tidak 404
    return data; // { balance, ... }
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat ringkasan poin"));
  }
}
export { getPointSummary as getLedgerSummary };

/** Riwayat klaim dari ledger userRewards */
export async function getRewardHistory(limit = 100) {
  try {
    const { data } = await API.get("/rewards/history", { params: { limit } });
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat riwayat klaim"));
  }
}
