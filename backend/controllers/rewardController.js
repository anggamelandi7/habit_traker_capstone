const { Op } = require('sequelize');
const { sequelize, Reward, User } = require('../models');
const { addPointsAtomic } = require('../services/pointsService');

/* =========================================================
   Helpers
========================================================= */
async function getUserBalance(userId, t = null) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'pointBalance', 'badge', 'username', 'email', 'totalPoints'],
    transaction: t || undefined,
    lock: t ? t.LOCK.UPDATE : undefined,
  });
  if (!user) throw new Error('User tidak ditemukan');
  const balance = Number(user.pointBalance ?? user.totalPoints ?? 0);
  return { user, balance };
}

function hasField(inst, key) {
  try {
    if (!inst) return false;
    if (typeof inst.get === 'function') return typeof inst.get(key) !== 'undefined';
    return key in inst;
  } catch { return false; }
}

/* =========================================================
   POST /rewards
========================================================= */
async function createReward(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    let { name, requiredPoints, description, expiryDate, isActive } = req.body || {};
    if ((requiredPoints === undefined || requiredPoints === null) && req.body?.points !== undefined) {
      requiredPoints = req.body.points; // kompat versi lama
    }

    if (!name || requiredPoints === undefined || requiredPoints === null) {
      return res.status(400).json({ error: 'name dan requiredPoints wajib diisi' });
    }
    const rp = Number(requiredPoints);
    if (!Number.isFinite(rp) || rp < 0) {
      return res.status(400).json({ error: 'requiredPoints harus angka >= 0' });
    }

    const reward = await Reward.create({
      userId: req.user.id,
      name: String(name).trim(),
      requiredPoints: rp,
      description: description || null,
      expiryDate: expiryDate || null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Reward dibuat', reward });
  } catch (err) {
    console.error('POST /rewards error:', err);
    return res.status(500).json({ error: 'Gagal membuat reward', detail: String(err?.message || err) });
  }
}

/* =========================================================
   GET /rewards
   -> kembalikan { balance, items[] } + flag claimable
========================================================= */
async function listRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date();
    const { balance } = await getUserBalance(req.user.id);

    const rows = await Reward.findAll({
      where: {
        userId: req.user.id,
        isActive: true, // hanya yang aktif
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }], // belum kadaluarsa
      },
      order: [['requiredPoints', 'ASC']],
    });

    const items = rows.map(r => {
      const required = Number(r.requiredPoints || 0);
      const hasStatus = hasField(r, 'status');
      const claimed = hasStatus ? r.get('status') === 'CLAIMED' : false;
      const claimable = !claimed && required >= 0 && balance >= required && (r.isActive ?? true) === true;

      return {
        id: r.id,
        userId: r.userId,
        name: r.name,
        description: r.description,
        requiredPoints: required,
        isActive: r.isActive,
        expiryDate: r.expiryDate,
        claimedAt: hasField(r, 'claimedAt') ? r.get('claimedAt') : null,
        status: hasStatus ? r.get('status') : undefined,
        // FE helper
        claimable,
        remainingPoints: Math.max(0, required - balance),
      };
    });

    return res.json({ balance, items });
  } catch (err) {
    console.error('GET /rewards error:', err);
    return res.status(500).json({ error: 'Gagal mengambil rewards', detail: String(err?.message || err) });
  }
}

/* =========================================================
   GET /rewards/user (riwayat semua reward user)
========================================================= */
async function getUserRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await Reward.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    console.error('GET /rewards/user error:', err);
    res.status(500).json({ error: 'Gagal mengambil data rewards' });
  }
}

/* =========================================================
   GET /rewards/total
========================================================= */
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
    res.status(500).json({ error: 'Gagal mengambil saldo poin' });
  }
}

/* =========================================================
   POST /rewards/:id/claim
   -> kunci reward agar TIDAK respawn: set isActive=false
      + (jika ada) status='CLAIMED', claimedAt=now
========================================================= */
async function claimReward(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const rewardId = Number(req.params.id);

    // Lock user & saldo
    const { balance } = await getUserBalance(userId, t);

    // Lock reward
    const reward = await Reward.findOne({
      where: { id: rewardId, userId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reward) { await t.rollback(); return res.status(404).json({ error: 'Reward tidak ditemukan / tidak aktif' }); }

    if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
      await t.rollback(); return res.status(400).json({ error: 'Reward sudah kadaluarsa' });
    }

    // jika model sudah punya status 'CLAIMED', jangan dobel klaim
    if (hasField(reward, 'status') && reward.get('status') === 'CLAIMED') {
      await t.rollback(); return res.status(409).json({ error: 'Reward sudah diklaim' });
    }

    const cost = Number(reward.requiredPoints || 0);
    if (balance < cost) {
      await t.rollback();
      return res.status(400).json({ error: 'Poin belum cukup untuk klaim reward ini' });
    }

    // Kurangi poin via ledger (DALAM transaksi yang sama)
    const ledgerRes = await addPointsAtomic({
      userId,
      delta: -cost,
      reason: 'claim_reward',
      refType: 'Reward',
      refId: reward.id,
      transaction: t,
    });

    // Kunci reward agar tidak respawn
    reward.isActive = false;
    if (hasField(reward, 'claimedAt')) reward.set('claimedAt', new Date());
    if (hasField(reward, 'status')) reward.set('status', 'CLAIMED');
    await reward.save({ transaction: t });

    await t.commit();
    return res.json({
      message: `Berhasil klaim reward: ${reward.name}`,
      reward: {
        id: reward.id,
        name: reward.name,
        requiredPoints: cost,
        isActive: reward.isActive,
        claimedAt: hasField(reward, 'claimedAt') ? reward.get('claimedAt') : null,
        status: hasField(reward, 'status') ? reward.get('status') : undefined,
      },
      balance: ledgerRes?.balanceAfter,
    });
  } catch (err) {
    console.error('POST /rewards/:id/claim error:', err);
    await t.rollback();
    res.status(500).json({ error: 'Gagal klaim reward', detail: String(err?.message || err) });
  }
}

module.exports = {
  createReward,
  listRewards,
  getUserRewards,
  getTotalPoints,
  claimReward,
};
