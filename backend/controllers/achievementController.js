// backend/controllers/achievementController.js
const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Achievement,
  Habit,
  HabitCompletion,
  Reward,
} = require('../models');
const { fmtWIB, getCurrentWindowWIB, getWindowMetaWIB } = require('../utils/period');

/* =========================================================
   Helpers
========================================================= */
const toInt = (n, d = 0) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
};

async function sumContribInWindow(userId, achievementId, winStart, winEnd, t = null) {
  const ids = (
    await Habit.findAll({
      where: { userId, achievementId, isActive: true },
      attributes: ['id'],
      raw: true,
      transaction: t || undefined,
    })
  ).map((x) => x.id);

  if (!ids.length) return 0;

  const rows = await HabitCompletion.findAll({
    where: {
      userId,
      habitId: { [Op.in]: ids },
      completedAt: { [Op.gte]: winStart, [Op.lt]: winEnd },
    },
    attributes: [[fn('COALESCE', fn('SUM', col('pointsAwarded')), 0), 'sumPoints']],
    raw: true,
    transaction: t || undefined,
  });

  return Number(rows?.[0]?.sumPoints || 0);
}

function computeStatusFor(achievement, now = new Date(), progressPoints = 0) {
  if (!achievement.validFrom || !achievement.validTo) return 'ACTIVE';
  if (now <= achievement.validTo) return 'ACTIVE';
  if ((achievement.frequency || 'Daily') === 'Weekly') {
    const target = toInt(achievement.targetPoints);
    return progressPoints >= target && target > 0 ? 'COMPLETED' : 'EXPIRED';
  }
  return 'EXPIRED';
}

/**
 * Pastikan setiap achievement memiliki window validFrom/validTo.
 * NOTE: gunakan createdAt sbg base utk Weekly (7 hari sejak dibuat)
 */
async function ensureWindowAndStatus(achievement, userId, t = null) {
  // Jika kosong, set berdasar object achievement (agar Weekly pakai createdAt)
  if (!achievement.validFrom || !achievement.validTo) {
    const { periodStart, periodEnd } = getCurrentWindowWIB(achievement);
    achievement.validFrom = periodStart;
    achievement.validTo = periodEnd;
    achievement.status = 'ACTIVE';
    await achievement.save({ transaction: t || undefined });
    return achievement;
  }

  // Lazy update status bila lewat window
  const now = new Date();
  if (now > achievement.validTo) {
    let progress = 0;
    if ((achievement.frequency || 'Daily') === 'Weekly') {
      progress = await sumContribInWindow(
        userId,
        achievement.id,
        achievement.validFrom,
        achievement.validTo,
        t
      );
    }
    const stat = computeStatusFor(achievement, now, progress);
    if (stat !== achievement.status) {
      achievement.status = stat;
      await achievement.save({ transaction: t || undefined });
    }
  }
  return achievement;
}

async function createRewardPairIfMissing(userId, ach, t = null) {
  const existed = await Reward.findOne({
    where: { userId, achievementId: ach.id },
    transaction: t || undefined,
  });
  if (existed) return existed;
  return Reward.create(
    {
      userId,
      name: ach.name,
      requiredPoints: Number(ach.targetPoints || 0),
      description: `Reward for achievement "${ach.name}"`,
      achievementId: ach.id,
      isActive: true,
      expiryDate: null,
    },
    { transaction: t || undefined }
  );
}

/* =========================================================
   NEW: GET /achievements/active?type=daily|weekly
   Mengembalikan kartu aktif + flag canInteract + daftar habits.
========================================================= */
async function getActive(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;
    const type = String(req.query.type || 'daily').toLowerCase() === 'weekly' ? 'Weekly' : 'Daily';

    const card = await Achievement.findOne({
      where: { userId, frequency: type, isActive: true },
      order: [['createdAt', 'DESC']],
      include: [{ model: Habit, required: false }],
    });

    if (!card) return res.json(null);

    await ensureWindowAndStatus(card, userId);

    const now = new Date();
    const inWindow = card.validFrom && card.validTo && now >= card.validFrom && now <= card.validTo;
    const canInteract = card.status === 'ACTIVE' && inWindow;

    return res.json({
      id: card.id,
      name: card.name,
      frequency: card.frequency,
      status: card.status,
      targetPoints: card.targetPoints,
      validFromUTC: card.validFrom,
      validToUTC: card.validTo,
      validFromWIB: fmtWIB(card.validFrom),
      validToWIB: fmtWIB(card.validTo),
      canInteract,
      habits: (card.Habits || []).map((h) => ({
        id: h.id,
        title: h.title,
        pointsPerCompletion: toInt(h.pointsPerCompletion),
        frequency: h.frequency,
        canComplete: canInteract,
      })),
    });
  } catch (err) {
    console.error('GET /achievements/active error:', err);
    return res.status(500).json({ error: 'Gagal mengambil achievement aktif' });
  }
}

/* =========================================================
   NEW: POST /achievements/daily  (window WIB hari ini)
========================================================= */
async function createDaily(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;
    const { name, targetPoints, description } = req.body || {};
    const tp = toInt(targetPoints);
    if (!name?.trim() || tp <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'name & targetPoints wajib' });
    }

    const win = getWindowMetaWIB('Daily');
    const ach = await Achievement.create(
      {
        userId,
        name: name.trim(),
        frequency: 'Daily',
        targetPoints: tp,
        description: description || null,
        isActive: true,
        status: 'ACTIVE',
        validFrom: new Date(win.validFromUTC),
        validTo: new Date(win.validToUTC),
      },
      { transaction: t }
    );

    await createRewardPairIfMissing(userId, ach, t);
    await t.commit();
    return res.status(201).json({ message: 'Daily dibuat', achievement: ach });
  } catch (err) {
    console.error('POST /achievements/daily error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal membuat daily' });
  }
}

/* =========================================================
   NEW: POST /achievements/weekly  (window 7 hari sejak dibuat)
========================================================= */
async function createWeekly(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;
    const { name, targetPoints, description } = req.body || {};
    const tp = toInt(targetPoints);
    if (!name?.trim() || tp <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'name & targetPoints wajib' });
    }

    // saat create, base = sekarang (createdAt), valid 7 hari ke depan
    const win = getWindowMetaWIB('Weekly');
    const ach = await Achievement.create(
      {
        userId,
        name: name.trim(),
        frequency: 'Weekly',
        targetPoints: tp,
        description: description || null,
        isActive: true,
        status: 'ACTIVE',
        validFrom: new Date(win.validFromUTC),
        validTo: new Date(win.validToUTC),
      },
      { transaction: t }
    );

    await createRewardPairIfMissing(userId, ach, t);
    await t.commit();
    return res.status(201).json({ message: 'Weekly dibuat', achievement: ach });
  } catch (err) {
    console.error('POST /achievements/weekly error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal membuat weekly' });
  }
}

/* =========================================================
   (Tetap ada) POST /achievements  — backward compat
========================================================= */
async function createAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;

    const { name, frequency = 'Daily', targetPoints, description, expiryDate } = req.body || {};
    if (!name || !['Daily', 'Weekly'].includes(frequency)) {
      await t.rollback();
      return res.status(400).json({ error: 'name & frequency wajib (Daily/Weekly)' });
    }
    const tp = toInt(targetPoints);
    if (tp <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'targetPoints harus angka > 0' });
    }

    const win = getWindowMetaWIB(frequency);
    const ach = await Achievement.create(
      {
        userId,
        name: name.trim(),
        frequency,
        targetPoints: tp,
        description: description || null,
        expiryDate: expiryDate || null, // legacy
        isActive: true,
        status: 'ACTIVE',
        validFrom: new Date(win.validFromUTC),
        validTo: new Date(win.validToUTC),
      },
      { transaction: t }
    );

    const reward = await createRewardPairIfMissing(userId, ach, t);
    await t.commit();
    return res.status(201).json({
      message: 'Achievement dibuat',
      achievement: ach,
      rewardPaired: { id: reward.id, name: reward.name, requiredPoints: reward.requiredPoints },
    });
  } catch (err) {
    console.error('POST /achievements error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal membuat achievement', detail: String(err?.message || err) });
  }
}

/* =========================================================
   LIST / UPDATE / DELETE / DETAIL / ADD-HABIT
   — window & progress dihitung dari validFrom/validTo kartu
========================================================= */
async function updateAchievement(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({ where: { id, userId: req.user.id, isActive: true } });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

    const { name, targetPoints, description } = req.body || {};
    if (name !== undefined) a.name = String(name).trim();
    if (targetPoints !== undefined) {
      const tp = toInt(targetPoints);
      if (tp <= 0) return res.status(400).json({ error: 'targetPoints harus angka > 0' });
      a.targetPoints = tp;
      await Reward.update({ requiredPoints: tp }, { where: { userId: req.user.id, achievementId: a.id } });
    }
    if (description !== undefined) a.description = description || null;

    await a.save();
    return res.json({ message: 'Achievement diperbarui', achievement: a });
  } catch (err) {
    console.error('PUT /achievements/:id error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui achievement', detail: String(err?.message || err) });
  }
}

async function deleteAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) { await t.rollback(); return res.status(400).json({ error: 'ID tidak valid' }); }

    const ach = await Achievement.findOne({ where: { id, userId, isActive: true }, transaction: t, lock: t.LOCK.UPDATE });
    if (!ach) { await t.rollback(); return res.status(404).json({ error: 'Achievement tidak ditemukan / sudah nonaktif' }); }

    ach.isActive = false;
    await ach.save({ transaction: t });
    await Reward.update({ isActive: false }, { where: { userId, achievementId: ach.id }, transaction: t });

    await t.commit();
    return res.json({ message: 'Achievement dihapus (soft delete) & reward pairing dinonaktifkan' });
  } catch (err) {
    console.error('DELETE /achievements/:id error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal menghapus achievement', detail: String(err?.message || err) });
  }
}

async function listAchievements(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const includeInactive = req.query.includeInactive === '1';
    const where = { userId: req.user.id };
    if (!includeInactive) where.isActive = true;

    const now = new Date();
    const items = await Achievement.findAll({ where, order: [['createdAt', 'DESC']] });

    const out = [];
    for (const a of items) {
      await ensureWindowAndStatus(a, req.user.id);

      // Gunakan window kartu (validFrom/validTo), bukan window "minggu berjalan"
      const periodStart = a.validFrom || new Date(); // fallback aman
      const periodEnd = a.validTo || new Date();

      const habits = await Habit.findAll({
        where: { userId: req.user.id, achievementId: a.id, isActive: true },
        attributes: ['id', 'title', 'frequency', 'pointsPerCompletion'],
        order: [['createdAt', 'ASC']],
      });

      const contributed = await sumContribInWindow(req.user.id, a.id, periodStart, periodEnd);
      const target = Number(a.targetPoints || 0);
      const progressPercent = target > 0 ? Math.min(100, Math.round((contributed / target) * 100)) : 0;
      const remainingPoints = Math.max(0, target - contributed);
      const claimable = target > 0 && contributed >= target;

      out.push({
        id: a.id,
        name: a.name,
        frequency: a.frequency,
        targetPoints: target,
        description: a.description,
        expiryDate: a.expiryDate || null,
        isActive: a.isActive,
        status: a.status,
        createdAt: a.createdAt,
        createdAtWIB: fmtWIB(a.createdAt),
        window: {
          validFromUTC: periodStart,
          validToUTC: periodEnd,
          validFromWIB: fmtWIB(periodStart),
          validToWIB: fmtWIB(periodEnd),
          nowInWindow: periodStart && periodEnd && now >= periodStart && now <= periodEnd,
        },
        habits: habits.map((h) => ({
          id: h.id, title: h.title, frequency: h.frequency, pointsPerCompletion: toInt(h.pointsPerCompletion),
        })),
        stats: {
          contributedPoints: contributed,
          progressPercent,
          remainingPoints,
          claimable,
        },
      });
    }

    const onlyClaimable = String(req.query.claimable || '') === '1';
    const result = onlyClaimable ? out.filter((x) => x.stats.claimable) : out;

    return res.json(result);
  } catch (err) {
    console.error('GET /achievements error:', err);
    return res.status(500).json({ error: 'Gagal mengambil achievements', detail: String(err?.message || err) });
  }
}

async function getAchievementDetail(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({ where: { id, userId: req.user.id } });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

    await ensureWindowAndStatus(a, req.user.id);

    const habits = await Habit.findAll({
      where: { userId: req.user.id, achievementId: a.id, isActive: true },
      attributes: ['id', 'title', 'frequency', 'pointsPerCompletion'],
      order: [['createdAt', 'ASC']],
    });

    return res.json({
      id: a.id,
      name: a.name,
      frequency: a.frequency,
      targetPoints: a.targetPoints,
      description: a.description,
      createdAt: a.createdAt,
      createdAtWIB: fmtWIB(a.createdAt),
      isActive: a.isActive,
      status: a.status,
      validFromUTC: a.validFrom,
      validToUTC: a.validTo,
      validFromWIB: fmtWIB(a.validFrom),
      validToWIB: fmtWIB(a.validTo),
      habits,
    });
  } catch (err) {
    console.error('GET /achievements/:id error:', err);
    return res.status(500).json({ error: 'Gagal mengambil detail achievement' });
  }
}

async function addHabitToAchievement(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({ where: { id, userId: req.user.id, isActive: true } });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan / sudah nonaktif' });

    const { title, pointsPerCompletion } = req.body || {};
    const p = toInt(pointsPerCompletion);
    if (!title?.trim() || p <= 0) return res.status(400).json({ error: 'title & pointsPerCompletion wajib' });

    const h = await Habit.create({
      userId: req.user.id,
      title: title.trim(),
      frequency: a.frequency,
      pointsPerCompletion: p,
      isActive: true,
      achievementId: a.id,
    });

    return res.status(201).json({ message: 'Habit ditambahkan', habit: h });
  } catch (err) {
    console.error('POST /achievements/:id/habits error:', err);
    return res.status(500).json({ error: 'Gagal menambah habit', detail: String(err?.message || err) });
  }
}

async function syncRewardsForUser(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;

    const achs = await Achievement.findAll({ where: { userId, isActive: true }, transaction: t });
    const created = [];
    for (const a of achs) {
      const exists = await Reward.findOne({ where: { userId, achievementId: a.id }, transaction: t });
      if (!exists) {
        const r = await Reward.create(
          {
            userId,
            name: a.name,
            requiredPoints: Number(a.targetPoints || 0),
            description: `Reward for achievement "${a.name}"`,
            achievementId: a.id,
            isActive: true,
            expiryDate: null,
          },
          { transaction: t }
        );
        created.push({ id: r.id, name: r.name, achievementId: a.id });
      }
    }

    await t.commit();
    return res.json({ message: 'Sync selesai', createdCount: created.length, created });
  } catch (err) {
    console.error('POST /achievements/sync-rewards error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal sync rewards', detail: String(err?.message || err) });
  }
}

async function claimAchievement(_req, res) {
  return res.status(400).json({ error: 'Gunakan klaim melalui halaman Rewards' });
}

module.exports = {
  // NEW
  getActive,
  createDaily,
  createWeekly,

  // existing / kompat
  createAchievement,
  listAchievements,
  getAchievementDetail,
  addHabitToAchievement,
  updateAchievement,
  deleteAchievement,
  syncRewardsForUser,
  claimAchievement,
};
