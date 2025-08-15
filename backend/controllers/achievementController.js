// controllers/achievementController.js
const { Op, fn, col } = require('sequelize');
const { sequelize, Achievement, Habit, User, PointLedger } = require('../models');
const { addPointsAtomic } = require('../services/pointsService');

function toInt(n, d = 0) { const x = Number(n); return Number.isFinite(x) ? x : d; }
function fmtWIB(d) {
  if (!d) return null;
  const od = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
  const ot = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: true };
  const datePart = new Intl.DateTimeFormat('en-GB', od).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', ot).format(d).replace(':', '.');
  return `${datePart} • ${timePart}`;
}

/**
 * POST /achievements
 * body: { name, targetPoints, description?, expiryDate? }
 */
exports.createAchievement = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { name, targetPoints, description, expiryDate } = req.body;

    if (!name || targetPoints === undefined || targetPoints === null) {
      return res.status(400).json({ error: 'name dan targetPoints wajib diisi' });
    }
    if (toInt(targetPoints) < 0) {
      return res.status(400).json({ error: 'targetPoints harus >= 0' });
    }

    const ach = await Achievement.create({
      userId: req.user.id,
      name,
      targetPoints: toInt(targetPoints),
      description: description || null,
      expiryDate: expiryDate || null,
      isActive: true,
    });

    res.status(201).json({ message: 'Achievement dibuat', achievement: ach });
  } catch (err) {
    console.error('POST /achievements error:', err);
    res.status(500).json({ error: 'Gagal membuat achievement', detail: String(err?.message || err) });
  }
};

/**
 * GET /achievements
 * List card + progress (progress dari saldo global; contributed dari ledger per habit)
 */
exports.listAchievements = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findByPk(req.user.id, { attributes: ['id', 'pointBalance'] });
    const balance = toInt(user?.pointBalance ?? 0);

    const achievements = await Achievement.findAll({
      where: { userId: req.user.id, isActive: true },
      include: [{ model: Habit, attributes: ['id', 'title', 'frequency', 'pointsPerCompletion'] }],
      order: [['createdAt', 'DESC']],
    });

    const items = await Promise.all(achievements.map(async (a) => {
      const habitIds = a.Habits.map(h => h.id);
      let contributed = 0;
      if (habitIds.length) {
        const rows = await PointLedger.findAll({
          where: { userId: req.user.id, habitId: { [Op.in]: habitIds }, delta: { [Op.gt]: 0 } },
          attributes: [[fn('COALESCE', fn('SUM', col('delta')), 0), 'sumDelta']],
          raw: true,
        });
        contributed = toInt(rows?.[0]?.sumDelta ?? 0);
      }
      const target = toInt(a.targetPoints);
      const progressPercent = target > 0 ? Math.min(100, Math.floor((balance / target) * 100)) : 100;
      const remainingPoints = Math.max(0, target - balance);

      return {
        id: a.id,
        name: a.name,
        targetPoints: target,
        description: a.description,
        expiryDate: a.expiryDate,
        isActive: a.isActive,
        createdAt: a.createdAt,
        createdAtWIB: fmtWIB(a.createdAt),
        habits: a.Habits.map(h => ({
          id: h.id, title: h.title, frequency: h.frequency, pointsPerCompletion: toInt(h.pointsPerCompletion),
        })),
        stats: {
          pointBalance: balance,
          contributedPoints: contributed,
          progressPercent,
          remainingPoints,
        },
      };
    }));

    res.json(items);
  } catch (err) {
    console.error('GET /achievements error:', err);
    res.status(500).json({ error: 'Gagal mengambil achievements', detail: String(err?.message || err) });
  }
};

/**
 * GET /achievements/:id
 */
exports.getAchievementDetail = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const ach = await Achievement.findOne({
      where: { id: +req.params.id, userId: req.user.id },
      include: [{ model: Habit, attributes: ['id', 'title', 'frequency', 'pointsPerCompletion'] }],
    });
    if (!ach) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

    const user = await User.findByPk(req.user.id, { attributes: ['pointBalance'] });
    const balance = toInt(user?.pointBalance ?? 0);
    const target = toInt(ach.targetPoints);

    const habitIds = ach.Habits.map(h => h.id);
    let contributed = 0;
    if (habitIds.length) {
      const rows = await PointLedger.findAll({
        where: { userId: req.user.id, habitId: { [Op.in]: habitIds }, delta: { [Op.gt]: 0 } },
        attributes: [[fn('COALESCE', fn('SUM', col('delta')), 0), 'sumDelta']],
        raw: true,
      });
      contributed = toInt(rows?.[0]?.sumDelta ?? 0);
    }

    const progressPercent = target > 0 ? Math.min(100, Math.floor((balance / target) * 100)) : 100;
    const remainingPoints = Math.max(0, target - balance);

    res.json({
      id: ach.id,
      name: ach.name,
      targetPoints: target,
      description: ach.description,
      expiryDate: ach.expiryDate,
      isActive: ach.isActive,
      createdAt: ach.createdAt,
      createdAtWIB: fmtWIB(ach.createdAt),
      habits: ach.Habits.map(h => ({
        id: h.id, title: h.title, frequency: h.frequency, pointsPerCompletion: toInt(h.pointsPerCompletion),
      })),
      stats: {
        pointBalance: balance,
        contributedPoints: contributed,
        progressPercent,
        remainingPoints,
      },
    });
  } catch (err) {
    console.error('GET /achievements/:id error:', err);
    res.status(500).json({ error: 'Gagal mengambil detail achievement', detail: String(err?.message || err) });
  }
};

/**
 * POST /achievements/:id/habits
 * body: { title, frequency, pointsPerCompletion }
 */
exports.addHabitToAchievement = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const ach = await Achievement.findOne({
      where: { id: +req.params.id, userId: req.user.id, isActive: true },
    });
    if (!ach) return res.status(404).json({ error: 'Achievement tidak ditemukan / tidak aktif' });

    const { Habit } = require('../models');
    const { title, frequency, pointsPerCompletion } = req.body;
    if (!title || !frequency) {
      return res.status(400).json({ error: 'title dan frequency wajib diisi' });
    }

    const habit = await Habit.create({
      userId: req.user.id,
      title,
      frequency, // "Daily" | "Weekly"
      pointsPerCompletion: toInt(pointsPerCompletion ?? 0),
      achievementId: ach.id,
    });

    res.status(201).json({ message: 'Habit ditambahkan ke card', habit });
  } catch (err) {
    console.error('POST /achievements/:id/habits error:', err);
    res.status(500).json({ error: 'Gagal menambahkan habit', detail: String(err?.message || err) });
  }
};

/**
 * POST /achievements/:id/claim
 * Kurangi saldo global jika cukup → ledger -targetPoints (reason: claim_achievement)
 */
exports.claimAchievement = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ambil achievement (boleh tanpa lock kalau tidak ada kolom yang diupdate)
    const ach = await Achievement.findOne({
      where: { id: +req.params.id, userId: req.user.id, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE, // aman untuk mencegah race klaim ganda
    });
    if (!ach) { await t.rollback(); return res.status(404).json({ error: 'Achievement tidak ditemukan / tidak aktif' }); }
    if (ach.expiryDate && new Date(ach.expiryDate) < new Date()) {
      await t.rollback(); return res.status(400).json({ error: 'Achievement sudah kadaluarsa' });
    }

    // Lock user dalam transaksi yang sama
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'pointBalance'], transaction: t, lock: t.LOCK.UPDATE });
    const balance = toInt(user?.pointBalance ?? 0);
    const cost = toInt(ach.targetPoints);
    if (balance < cost) {
      await t.rollback();
      return res.status(400).json({ error: 'Poin belum cukup untuk klaim achievement ini' });
    }

    // Kurangi poin via ledger (pakai transaksi yang sama!)
    const { balanceAfter } = await addPointsAtomic({
      userId: req.user.id,
      delta: -cost,
      reason: 'claim_achievement',
      refType: 'Achievement',
      refId: ach.id,
      transaction: t,
    });

    await t.commit();
    return res.json({
      message: `Berhasil klaim achievement: ${ach.name}`,
      achievement: { id: ach.id, name: ach.name, targetPoints: cost },
      balanceAfter,
    });
  } catch (err) {
    console.error('POST /achievements/:id/claim error:', err);
    await t.rollback();
    res.status(500).json({ error: 'Gagal klaim achievement', detail: String(err?.message || err) });
  }
};
