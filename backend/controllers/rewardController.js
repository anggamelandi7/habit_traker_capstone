// controllers/rewardController.js
const { Op } = require('sequelize');
const { sequelize, Reward, User } = require('../models');
const { addPointsAtomic } = require('../services/pointsService');

async function getUserBalance(userId, t = null) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'pointBalance', 'badge', 'username', 'email', 'totalPoints'],
    transaction: t,
    lock: t ? t.LOCK.UPDATE : undefined,
  });
  if (!user) throw new Error('User tidak ditemukan');
  const balance = Number(user.pointBalance ?? user.totalPoints ?? 0);
  return { user, balance };
}

/**
 * POST /rewards
 * body: { name, requiredPoints, description?, expiryDate?, isActive? }
 * (kompatibel dengan { points } dari versi lama)
 */
async function createReward(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    let { name, requiredPoints, description, expiryDate, isActive } = req.body;
    if ((requiredPoints === undefined || requiredPoints === null) && req.body.points !== undefined) {
      requiredPoints = req.body.points;
    }

    if (!name || requiredPoints === undefined || requiredPoints === null) {
      return res.status(400).json({ error: 'name dan requiredPoints wajib diisi' });
    }
    if (Number.isNaN(Number(requiredPoints)) || Number(requiredPoints) < 0) {
      return res.status(400).json({ error: 'requiredPoints harus angka >= 0' });
    }

    const payload = {
      userId: req.user.id,
      name,
      requiredPoints: Number(requiredPoints),
      description: description || null,
      expiryDate: expiryDate || null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    };

    const reward = await Reward.create(payload);
    return res.status(201).json({ message: 'Reward dibuat', reward });
  } catch (err) {
    console.error('POST /rewards error:', err);
    return res.status(500).json({ error: 'Gagal membuat reward', detail: String(err?.message || err) });
  }
}

async function listRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const now = new Date();
    const rewards = await Reward.findAll({
      where: {
        userId: req.user.id,
        isActive: true,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
      },
      order: [['requiredPoints', 'ASC']],
    });
    res.json(rewards);
  } catch (err) {
    console.error('listRewards error:', err);
    res.status(500).json({ error: 'Gagal mengambil rewards', detail: String(err?.message || err) });
  }
}

async function getUserRewards(req, res) {
  try {
    const rewards = await Reward.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(rewards);
  } catch (err) {
    console.error('GET /rewards/user error:', err);
    res.status(500).json({ error: 'Gagal mengambil data rewards' });
  }
}

async function getTotalPoints(req, res) {
  try {
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
    res.status(500).json({ error: 'Gagal mengambil saldo poin' });
  }
}

/**
 * POST /rewards/:id/claim
 * Kompatibilitas untuk reward lama.
 */
async function claimReward(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const rewardId = +req.params.id;

    // Lock user & ambil saldo
    const { balance } = await getUserBalance(userId, t);

    // Lock reward milik user
    const reward = await Reward.findOne({
      where: { id: rewardId, userId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reward) { await t.rollback(); return res.status(404).json({ error: 'Reward tidak ditemukan / tidak aktif' }); }
    if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
      await t.rollback(); return res.status(400).json({ error: 'Reward sudah kadaluarsa' });
    }

    const cost = Number(reward.requiredPoints || 0);
    if (balance < cost) { await t.rollback(); return res.status(400).json({ error: 'Poin belum cukup untuk claim reward ini' }); }

    // Kurangi poin via ledger (pakai transaksi yang sama!)
    const { balanceAfter } = await addPointsAtomic({
      userId,
      delta: -cost,
      reason: 'claim_reward',
      refType: 'Reward',
      refId: reward.id,
      transaction: t,
    });

    // (Opsional) Tandai claimed kalau model punya kolomnya
    if ('isClaimed' in reward) {
      reward.isClaimed = true;
      reward.claimedAt = new Date();
      await reward.save({ transaction: t });
    }

    await t.commit();
    return res.json({
      message: `Berhasil klaim reward: ${reward.name}`,
      reward: {
        id: reward.id,
        name: reward.name,
        requiredPoints: cost,
        claimedAt: reward.claimedAt ?? null,
        isClaimed: reward.isClaimed ?? undefined,
      },
      balanceAfter,
    });
  } catch (err) {
    console.error('POST /rewards/:id/claim error:', err);
    await t.rollback();
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
