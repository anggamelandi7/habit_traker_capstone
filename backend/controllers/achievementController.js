// backend/controllers/achievementController.js
const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Achievement,
  Habit,
  HabitCompletion,
  Reward,
  User,
} = require('../models');
const { fmtWIB, getCurrentWindowWIB } = require('../utils/period');

// ====================== Helpers ======================

const toInt = (n, d = 0) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
};

/**
 * Buat Reward pasangan untuk sebuah Achievement (jika belum ada).
 * - name   : sama dengan achievement.name
 * - points : requiredPoints = targetPoints
 */
async function createOrEnsureRewardForAchievement(userId, achievement, t = null) {
  const existed = await Reward.findOne({
    where: { userId, achievementId: achievement.id },
    transaction: t || undefined,
  });
  if (existed) return existed;

  const reward = await Reward.create(
    {
      userId,
      name: achievement.name,
      requiredPoints: Number(achievement.targetPoints || 0),
      description: `Reward for achievement "${achievement.name}"`,
      achievementId: achievement.id,
      isActive: true,
      expiryDate: null,
    },
    { transaction: t || undefined }
  );

  return reward;
}

/**
 * Hitung kontribusi poin pada window (daily/weekly) berjalan untuk sebuah Achievement.
 */
async function getContributionForAchievement(userId, achievement) {
  const { periodStart, periodEnd } = getCurrentWindowWIB(
    achievement.frequency || 'Daily'
  );

  const habits = await Habit.findAll({
    where: { userId, achievementId: achievement.id, isActive: true },
    attributes: ['id', 'pointsPerCompletion'],
  });
  if (!habits.length) return { contributed: 0, percent: 0 };

  const habitIds = habits.map((h) => h.id);

  const rows = await HabitCompletion.findAll({
    where: {
      userId,
      habitId: { [Op.in]: habitIds },
      completedAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd },
    },
    attributes: [[fn('COALESCE', fn('SUM', col('pointsAwarded')), 0), 'sumPoints']],
    raw: true,
  });

  const total = Number(rows?.[0]?.sumPoints || 0);
  const target = Number(achievement.targetPoints || 0);
  const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

  return { contributed: total, percent, periodStart, periodEnd };
}

// ====================== Controllers ======================

/**
 * POST /achievements
 * body: { name, frequency: 'Daily'|'Weekly', targetPoints, description?, expiryDate? }
 * Efek:
 * - Membuat Achievement aktif
 * - Auto: membuat Reward pairing (achievementId terisi)
 */
async function createAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;

    const { name, frequency = 'Daily', targetPoints, description, expiryDate } =
      req.body || {};
    if (!name || !['Daily', 'Weekly'].includes(frequency)) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: 'name & frequency wajib (Daily/Weekly)' });
    }
    const tp = toInt(targetPoints);
    if (tp <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: 'targetPoints harus angka > 0' });
    }

    const ach = await Achievement.create(
      {
        userId,
        name: name.trim(),
        frequency,
        targetPoints: tp,
        description: description || null,
        expiryDate: expiryDate || null,
        isActive: true,
      },
      { transaction: t }
    );

    // Auto pairing reward
    const reward = await createOrEnsureRewardForAchievement(userId, ach, t);

    await t.commit();
    return res.status(201).json({
      message: 'Achievement dibuat',
      achievement: ach,
      rewardPaired: {
        id: reward.id,
        name: reward.name,
        requiredPoints: reward.requiredPoints,
      },
    });
  } catch (err) {
    console.error('POST /achievements error:', err);
    await t.rollback();
    return res.status(500).json({
      error: 'Gagal membuat achievement',
      detail: String(err?.message || err),
    });
  }
}

/**
 * PUT /achievements/:id
 * Boleh ubah: name, targetPoints, description
 * (frequency tidak diubah demi konsistensi window & child habits)
 */
async function updateAchievement(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({
      where: { id, userId: req.user.id, isActive: true },
    });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

    const { name, targetPoints, description } = req.body || {};
    if (name !== undefined) a.name = String(name).trim();
    if (targetPoints !== undefined) {
      const tp = toInt(targetPoints);
      if (tp <= 0)
        return res
          .status(400)
          .json({ error: 'targetPoints harus angka > 0' });
      a.targetPoints = tp;

      // sinkronkan requiredPoints reward pair (jika ada)
      await Reward.update(
        { requiredPoints: tp },
        { where: { userId: req.user.id, achievementId: a.id } }
      );
    }
    if (description !== undefined) a.description = description || null;

    await a.save();
    return res.json({ message: 'Achievement diperbarui', achievement: a });
  } catch (err) {
    console.error('PUT /achievements/:id error:', err);
    return res.status(500).json({
      error: 'Gagal memperbarui achievement',
      detail: String(err?.message || err),
    });
  }
}

/**
 * DELETE /achievements/:id
 * Soft delete (isActive=false) + nonaktifkan reward pairing
 */
async function deleteAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'ID tidak valid' });
    }

    const ach = await Achievement.findOne({
      where: { id, userId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!ach) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: 'Achievement tidak ditemukan / sudah nonaktif' });
    }

    ach.isActive = false;
    await ach.save({ transaction: t });

    await Reward.update(
      { isActive: false },
      { where: { userId, achievementId: ach.id }, transaction: t }
    );

    await t.commit();
    return res.json({
      message: 'Achievement dihapus (soft delete) & reward pairing dinonaktifkan',
    });
  } catch (err) {
    console.error('DELETE /achievements/:id error:', err);
    await t.rollback();
    return res.status(500).json({
      error: 'Gagal menghapus achievement',
      detail: String(err?.message || err),
    });
  }
}

/**
 * GET /achievements
 * Default: hanya isActive=true (kecuali ?includeInactive=1)
 * Menghitung:
 * - contributedPoints pada window berjalan
 * - progressPercent, remainingPoints, claimable
 * - missed (hanya jika achievement sudah ada sebelum window kemarin berakhir)
 * - expired (daily lewat window & progress < 100)
 * Optional filter: ?claimable=1 untuk hanya yang siap klaim (FE Rewards)
 */
async function listAchievements(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const includeInactive = req.query.includeInactive === '1';
    const where = { userId: req.user.id };
    if (!includeInactive) where.isActive = true;

    const now = new Date();
    const items = await Achievement.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const out = [];
    for (const a of items) {
      const freq = a.frequency;
      const { contributed, percent, periodStart, periodEnd } =
        await getContributionForAchievement(req.user.id, a);

      // habits aktif (untuk tampilkan ringkas)
      const habits = await Habit.findAll({
        where: { userId: req.user.id, achievementId: a.id, isActive: true },
        attributes: ['id', 'title', 'frequency', 'pointsPerCompletion'],
        order: [['createdAt', 'ASC']],
      });

      // missed logic (Daily) – hanya jika achievement sudah ada sebelum window kemarin berakhir
      let missed = false;
      if (freq === 'Daily') {
        const prevStart = new Date(periodStart);
        const prevEnd = new Date(periodEnd);
        prevStart.setDate(prevStart.getDate() - 1);
        prevEnd.setDate(prevEnd.getDate() - 1);

        if (new Date(a.createdAt) <= prevEnd) {
          let contributedPrev = 0;
          if (habits.length) {
            const rowsPrev = await HabitCompletion.findAll({
              where: {
                userId: req.user.id,
                habitId: { [Op.in]: habits.map((h) => h.id) },
                completedAt: { [Op.gte]: prevStart, [Op.lt]: prevEnd },
              },
              attributes: [
                [fn('COALESCE', fn('SUM', col('pointsAwarded')), 0), 'sumPoints'],
              ],
              raw: true,
            });
            contributedPrev = Number(rowsPrev?.[0]?.sumPoints || 0);
          }
          missed = contributedPrev === 0;
        } else {
          missed = false;
        }
      }

      const target = Number(a.targetPoints || 0);
      const progressPercent = target > 0 ? Math.min(100, percent) : 100;
      const remainingPoints = Math.max(0, target - contributed);
      const claimable = target > 0 && contributed >= target;
      const expired = freq === 'Daily' && now > periodEnd && progressPercent < 100;

      out.push({
        id: a.id,
        name: a.name,
        frequency: a.frequency,
        targetPoints: target,
        description: a.description,
        expiryDate: a.expiryDate || null,
        isActive: a.isActive,
        createdAt: a.createdAt,
        createdAtWIB: fmtWIB(a.createdAt),
        habits: habits.map((h) => ({
          id: h.id,
          title: h.title,
          frequency: h.frequency,
          pointsPerCompletion: toInt(h.pointsPerCompletion),
        })),
        stats: {
          contributedPoints: contributed,
          progressPercent,
          remainingPoints,
          claimable,
          alreadyClaimed: false, // jika pakai AchievementClaims, ganti sesuai logic
          windowEndWIB: fmtWIB(periodEnd),
          missed: freq === 'Daily' ? missed : false,
          expired,
        },
      });
    }

    const onlyClaimable = String(req.query.claimable || '') === '1';
    const result = onlyClaimable
      ? out.filter((x) => x.stats.claimable && !x.stats.alreadyClaimed)
      : out;

    return res.json(result);
  } catch (err) {
    console.error('GET /achievements error:', err);
    return res.status(500).json({
      error: 'Gagal mengambil achievements',
      detail: String(err?.message || err),
    });
  }
}

/**
 * GET /achievements/:id
 */
async function getAchievementDetail(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({
      where: { id, userId: req.user.id },
    });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

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
      habits,
    });
  } catch (err) {
    console.error('GET /achievements/:id error:', err);
    return res
      .status(500)
      .json({ error: 'Gagal mengambil detail achievement' });
  }
}

/**
 * POST /achievements/:id/habits
 * body: { title, pointsPerCompletion }
 * - frequency habit otomatis mengikuti achievement
 */
async function addHabitToAchievement(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({
      where: { id, userId: req.user.id, isActive: true },
    });
    if (!a)
      return res
        .status(404)
        .json({ error: 'Achievement tidak ditemukan / sudah nonaktif' });

    const { title, pointsPerCompletion } = req.body || {};
    const p = toInt(pointsPerCompletion);
    if (!title?.trim() || p <= 0)
      return res
        .status(400)
        .json({ error: 'title & pointsPerCompletion wajib' });

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
    return res.status(500).json({
      error: 'Gagal menambah habit',
      detail: String(err?.message || err),
    });
  }
}

/**
 * POST /achievements/sync-rewards
 * Backfill: buat reward pair untuk semua achievement aktif yang belum punya reward.
 */
async function syncRewardsForUser(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;

    const achs = await Achievement.findAll({
      where: { userId, isActive: true },
      transaction: t,
    });

    const created = [];
    for (const a of achs) {
      const exists = await Reward.findOne({
        where: { userId, achievementId: a.id },
        transaction: t,
      });
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
    return res.json({
      message: 'Sync selesai',
      createdCount: created.length,
      created,
    });
  } catch (err) {
    console.error('POST /achievements/sync-rewards error:', err);
    await t.rollback();
    return res.status(500).json({
      error: 'Gagal sync rewards',
      detail: String(err?.message || err),
    });
  }
}

/**
 * POST /achievements/:id/claim
 * Sesuai desain final: klaim dilakukan dari halaman Rewards (POST /rewards/:id/claim).
 */
async function claimAchievement(_req, res) {
  return res
    .status(400)
    .json({ error: 'Gunakan klaim melalui halaman Rewards' });
}

module.exports = {
  createAchievement,
  listAchievements,
  getAchievementDetail,
  addHabitToAchievement,
  updateAchievement,
  deleteAchievement,
  syncRewardsForUser,
  claimAchievement,
};
