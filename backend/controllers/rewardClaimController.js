const { Op } = require('sequelize');
const { sequelize, Reward, User } = require('../models');
const { addPointsAtomic } = require('../services/pointsService'); // pastikan path benar

/**
 * Helper: ambil saldo user (pointBalance, fallback totalPoints)
 */
async function getUserBalance(userId, t = null) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'email', 'badge', 'pointBalance', 'totalPoints'],
    transaction: t || undefined,
  });
  if (!user) throw new Error('User tidak ditemukan');
  const balance = Number(user.pointBalance ?? user.totalPoints ?? 0);
  return { user, balance };
}

/**
 * POST /rewards
 * Body: { name, requiredPoints, description?, expiryDate?, isActive? }
 */
async function createReward(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    let { name, requiredPoints, description, expiryDate, isActive } = req.body;

    // backward-compat: jika FE lama kirim "points"
    if ((requiredPoints === undefined || requiredPoints === null) && req.body.points !== undefined) {
      requiredPoints = req.body.points;
    }

    if (!name || requiredPoints === undefined || requiredPoints === null) {
      return res.status(400).json({ error: 'name dan requiredPoints wajib diisi' });
    }
    if (Number.isNaN(Number(requiredPoints)) || Number(requiredPoints) < 0) {
      return res.status(400).json({ error: 'requiredPoints harus angka >= 0' });
    }

    const reward = await Reward.create({
      userId: req.user.id,
      name,
      requiredPoints: Number(requiredPoints),
      description: description || null,
      expiryDate: expiryDate || null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    
    });

    res.status(201).json({ message: 'Reward dibuat', reward });
  } catch (err) {
    console.error('POST /rewards error:', err);
    res.status(500).json({ error: 'Gagal membuat reward', detail: String(err?.message || err) });
  }
}

/**
 * GET /rewards
 * Mengembalikan daftar reward aktif milik user + flag claimable berdasarkan saldo
 * Response: { balance, items: [ ... ] }
 */
async function listRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date();
    const { balance } = await getUserBalance(req.user.id);

    const rewards = await Reward.findAll({
      where: {
        userId: req.user.id,
        isActive: true,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
      },
      order: [['requiredPoints', 'ASC'], ['createdAt', 'DESC']],
    });

    const items = rewards.map((r) => {
      const required = Number(r.requiredPoints || 0);
      return {
        id: r.id,
        userId: r.userId,
        name: r.name,
        requiredPoints: required,
        description: r.description,
        expiryDate: r.expiryDate,
        isActive: !!r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        claimable: balance >= required,
        remainingPoints: Math.max(0, required - balance),
      };
    });

    res.json({ balance, items });
  } catch (err) {
    console.error('GET /rewards error:', err);
    res.status(500).json({ error: 'Gagal mengambil rewards', detail: String(err?.message || err) });
  }
}

/**
 * GET /rewards/user
 * Mengembalikan semua reward user (apa pun statusnya)
 */
async function getUserRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const rewards = await Reward.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(rewards);
  } catch (err) {
    console.error('GET /rewards/user error:', err);
    res.status(500).json({ error: 'Gagal mengambil data rewards', detail: String(err?.message || err) });
  }
}

/**
 * GET /rewards/total
 * Info saldo user saat ini
 */
async function getTotalPoints(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { user, balance } = await getUserBalance(req.user.id);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      badge: user.badge,
      pointBalance: Number(user.pointBalance ?? 0),
      totalPoints_legacy: user.totalPoints !== undefined ? Number(user.totalPoints) : null,
      balance,
    });
  } catch (err) {
    console.error('GET /rewards/total error:', err);
    res.status(500).json({ error: 'Gagal mengambil saldo poin', detail: String(err?.message || err) });
  }
}

/**
 * POST /rewards/:id/claim
 * Klaim reward → cek saldo ≥ requiredPoints → kurangi saldo via ledger → mark claimed (jika ada kolomnya)
 */
async function claimReward(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;
    const rewardId = Number(req.params.id);
    if (!Number.isFinite(rewardId)) return res.status(400).json({ error: 'Reward ID tidak valid' });

    // Ambil saldo
    const { balance } = await getUserBalance(userId);

    // Ambil reward (user scope) dan validasi aktif/expiry
    const now = new Date();
    const reward = await Reward.findOne({
      where: {
        id: rewardId,
        userId,
        isActive: true,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
      },
    });

    if (!reward) {
      return res.status(404).json({ error: 'Reward tidak ditemukan / tidak aktif / sudah kadaluarsa' });
    }

    // Jika ada kolom isClaimed & claimedAt dan reward hanya sekali pakai
    if ('isClaimed' in reward && reward.isClaimed) {
      return res.status(400).json({ error: 'Reward sudah di-claim' });
    }

    const cost = Number(reward.requiredPoints || 0);
    if (balance < cost) {
      return res.status(400).json({ error: 'Poin belum cukup untuk claim reward ini' });
    }

    // Kurangi poin via ledger (atomic di service)
    const { balanceAfter } = await addPointsAtomic({
      userId,
      delta: -cost,
      reason: 'claim',
      refType: 'Reward',
      refId: reward.id,
    });

    // Tandai claimed (jika kolom tersedia)
    if ('isClaimed' in reward) {
      reward.isClaimed = true;
      reward.claimedAt = new Date();
      await reward.save();
    }

    return res.json({
      message: `Berhasil klaim reward: ${reward.name}`,
      reward: {
        id: reward.id,
        name: reward.name,
        ...(reward.claimedAt ? { claimedAt: reward.claimedAt } : {}),
      },
      balanceAfter,
    });
  } catch (err) {
    console.error('POST /rewards/:id/claim error:', err);
    res.status(500).json({ error: 'Gagal claim reward', detail: String(err?.message || err) });
  }
}

module.exports = {
  createReward,
  listRewards,
  getUserRewards,
  getTotalPoints,
  claimReward,
};
