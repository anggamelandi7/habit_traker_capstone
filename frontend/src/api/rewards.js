// src/api/rewards.js
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

/**
 * Ambil rewards: backend mengembalikan { balance, items: [...] }
 * Normalisasi supaya selalu { items, balance }
 */
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

/**
 * Klaim reward by id
 * @param {number|string} rewardId
 */
export async function claimReward(rewardId) {
  try {
    const { data } = await API.post(`/rewards/${rewardId}/claim`);
    return data; // mis. { balance, reward }
  } catch (err) {
    throw new Error(toMessage(err, "Gagal klaim reward"));
  }
}

/**
 * (Opsional) Ringkasan poin/ledger apabila endpoint tersedia
 */
export async function getPointSummary() {
  try {
    const { data } = await API.get("/points/summary");
    return data; // { pointBalance, earned, spent, ... }
  } catch (err) {
    throw new Error(toMessage(err, "Gagal memuat ringkasan poin"));
  }
}

// Alias supaya impor legacy tidak error di beberapa file:
export { getPointSummary as getLedgerSummary };
