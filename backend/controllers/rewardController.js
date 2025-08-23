const { Op } = require('sequelize');
const { sequelize, Reward, User, UserReward } = require('../models');

/* ================== Helpers ================== */
function hasField(inst, key) {
  try {
    if (!inst) return false;
    if (typeof inst.get === 'function') return typeof inst.get(key) !== 'undefined';
    return key in inst;
  } catch { return false; }
}

async function getUserBalance(userId, t = null) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'email', 'badge', 'pointBalance', 'totalPoints'],
    transaction: t || undefined,
    lock: t ? t.LOCK.UPDATE : undefined,
  });
  if (!user) throw new Error('User tidak ditemukan');

  // dukung dua skema saldo (pointBalance baru / totalPoints legacy)
  const balance = Number(user.pointBalance ?? user.totalPoints ?? 0);
  return { user, balance };
}

async function setUserBalance(user, newBalance, t) {
  if (hasField(user, 'pointBalance')) user.set('pointBalance', newBalance);
  else if (hasField(user, 'totalPoints')) user.set('totalPoints', newBalance);
  await user.save({ transaction: t });
}

/* ================== POST /rewards (buat katalog) ================== */
async function createReward(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    let { name, requiredPoints, description, expiryDate, isActive } = req.body || {};
    if ((requiredPoints === undefined || requiredPoints === null) && req.body?.points !== undefined) {
      requiredPoints = req.body.points;
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
    return res.status(500).json({ error: 'Gagal membuat reward' });
  }
}

/* ================== GET /rewards -> daftar + saldo ================== */
async function listRewards(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const now = new Date();
    const userId = req.user.id;
    const { balance } = await getUserBalance(userId);

    // Katalog reward aktif milik user
    const rows = await Reward.findAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
      },
      order: [['requiredPoints', 'ASC']],
    });

    // Ambil klaim yang sudah terjadi dari ledger userRewards
    const rewardIds = rows.map(r => r.id);
    const claimed = await UserReward.findAll({
      where: { userId, rewardId: { [Op.in]: rewardIds }, status: 'CLAIMED' },
      attributes: ['rewardId'],
    });
    const claimedSet = new Set(claimed.map(r => r.rewardId));

    const items = rows.map(r => {
      const required = Number(r.requiredPoints || 0);
      const alreadyClaimed = claimedSet.has(r.id); // sumber kebenaran: ledger
      const claimable = !alreadyClaimed && balance >= required && (r.isActive ?? true) === true;

      return {
        id: r.id,
        userId: r.userId,
        name: r.name,
        description: r.description,
        requiredPoints: required,
        isActive: r.isActive,
        expiryDate: r.expiryDate,
        claimable,
        remainingPoints: Math.max(0, required - balance),
      };
    });

    return res.json({ balance, items });
  } catch (err) {
    console.error('GET /rewards error:', err);
    return res.status(500).json({ error: 'Gagal mengambil rewards' });
  }
}

/* ================== GET /rewards/total ================== */
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

/* ================== POST /rewards/:id/claim ================== */
async function claimReward(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }

    const userId = req.user.id;
    const rewardId = Number(req.params.id);
    const idempotencyKey = req.headers['x-idempotency-key'] || null;

    // Lock saldo user
    const { user, balance } = await getUserBalance(userId, t);

    // Lock reward yang aktif milik user
    const reward = await Reward.findOne({
      where: { id: rewardId, userId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reward) { await t.rollback(); return res.status(404).json({ error: 'Reward tidak ditemukan / tidak aktif' }); }

    // Cek expiry
    if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
      await t.rollback(); return res.status(400).json({ error: 'Reward sudah kadaluarsa' });
    }

    // Sudah pernah diklaim?
    const dupe = await UserReward.findOne({
      where: { userId, rewardId, status: 'CLAIMED' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (dupe) { await t.rollback(); return res.status(409).json({ error: 'Reward sudah diklaim' }); }

    // Cukup poin?
    const cost = Number(reward.requiredPoints || 0);
    if (balance < cost) {
      await t.rollback(); return res.status(400).json({ error: 'Poin belum cukup untuk klaim reward ini' });
    }

    // Kurangi saldo user
    const newBalance = balance - cost;
    await setUserBalance(user, newBalance, t);

    // Catat di ledger userRewards
    await UserReward.create({
      userId,
      rewardId,
      status: 'CLAIMED',
      claimedAt: new Date(),
      pointsSpent: cost,
      balanceBefore: balance,
      balanceAfter: newBalance,
      idempotencyKey,
      metadata: { client: 'web' },
    }, { transaction: t });

    // Kunci reward agar tidak "muncul lagi"
    reward.isActive = false;
    await reward.save({ transaction: t });

    await t.commit();
    return res.json({
      message: `Berhasil klaim reward: ${reward.name}`,
      reward: {
        id: reward.id,
        name: reward.name,
        requiredPoints: cost,
        isActive: reward.isActive,
      },
      balance: newBalance,
    });
  } catch (err) {
    await t.rollback();
    if (err?.name === 'SequelizeUniqueConstraintError') {
      // jika user klik ganda sangat cepat & kena unique (userId,rewardId)
      return res.status(200).json({ message: 'Idempotent OK' });
    }
    console.error('POST /rewards/:id/claim error:', err);
    res.status(500).json({ error: 'Gagal klaim reward' });
  }
}

/* ================== GET /rewards/history ================== */
async function getRewardHistory(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    const rows = await UserReward.findAll({
      where: { userId },
      include: [{ model: Reward, attributes: ['id', 'name', 'description', 'requiredPoints', 'isActive', 'expiryDate'] }],
      order: [['claimedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: Number(req.query.limit) || 200,
    });

    const items = rows.map(r => ({
      id: r.id,
      rewardId: r.rewardId,
      name: r.Reward?.name || `Reward #${r.rewardId}`,
      description: r.Reward?.description || null,
      requiredPoints: r.Reward?.requiredPoints ?? r.pointsSpent ?? null,
      status: r.status,
      claimedAt: r.claimedAt,
      pointsSpent: r.pointsSpent,
      balanceBefore: r.balanceBefore,
      balanceAfter: r.balanceAfter,
      isActive: r.Reward?.isActive,
      expiryDate: r.Reward?.expiryDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json({ items });
  } catch (err) {
    console.error('GET /rewards/history error:', err);
    res.status(500).json({ error: 'Gagal memuat riwayat reward' });
  }
}

/* ================== (Legacy) GET /rewards/user ================== */
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

module.exports = {
  createReward,
  listRewards,
  getTotalPoints,
  claimReward,
  getRewardHistory,
  getUserRewards,
};
