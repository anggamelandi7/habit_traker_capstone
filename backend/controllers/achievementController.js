// backend/controllers/achievementController.js
const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Achievement,
  AchievementClaim,   // boleh tidak lengkap; kontrol lewat modelHasAttr
  Habit,
  HabitCompletion,
  Reward,
  User,
} = require('../models');

/* ========================== Helpers umum ========================== */
const TZ = 'Asia/Jakarta';
const toInt = (n, d = 0) => { const x = Number(n); return Number.isFinite(x) ? x : d; };
const modelHasAttr = (model, key) => !!(model?.rawAttributes && model.rawAttributes[key]);

function fmtWIB(isoOrDate) {
  if (!isoOrDate) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ, year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(isoOrDate));
  } catch { return String(isoOrDate); }
}

// WIB start-of-day & end-of-day
function wibStartOfDay(d = new Date()) {
  const z = new Date(d);
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(z);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(z);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(z);
  return new Date(`${y}-${m}-${dd}T00:00:00+07:00`);
}
function wibEndOfDay(d = new Date()) {
  const start = wibStartOfDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

// Window default jika kolom validFrom/validTo tidak ada di DB
function deriveWindow(achievement) {
  const freq = (achievement.frequency || 'Daily');
  if (freq === 'Weekly') {
    const start = achievement.createdAt ? new Date(achievement.createdAt) : new Date();
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  }
  // Daily
  return { start: wibStartOfDay(), end: wibEndOfDay() };
}

// Pastikan window exist di object (tanpa harus menulis DB jika kolomnya tidak ada)
async function ensureWindowOnInstance(a, t = null) {
  const hasVF = modelHasAttr(Achievement, 'validFrom');
  const hasVT = modelHasAttr(Achievement, 'validTo');

  if (hasVF && hasVT) {
    if (!a.validFrom || !a.validTo) {
      const { start, end } = deriveWindow(a);
      a.validFrom = start;
      a.validTo = end;
      if (!a.status) a.status = 'ACTIVE';
      await a.save({ transaction: t || undefined });
    }
    return { start: a.validFrom, end: a.validTo };
  }

  // Kolom tidak ada → pakai window derivatif tanpa menyimpan
  const w = deriveWindow(a);
  a.dataValues.validFrom = a.dataValues.validFrom || w.start;
  a.dataValues.validTo = a.dataValues.validTo || w.end;
  if (!a.status) a.status = 'ACTIVE';
  return w;
}

function computeStatusFor(a, now = new Date(), contributed = 0) {
  const target = toInt(a.targetPoints);
  const end = a.validTo || deriveWindow(a).end;
  if (now <= end) return 'ACTIVE';
  if ((a.frequency || 'Daily') === 'Weekly')
    return (target > 0 && contributed >= target) ? 'COMPLETED' : 'EXPIRED';
  return 'EXPIRED';
}

async function sumContribInWindow(userId, achievementId, winStart, winEnd, t = null) {
  const ids = (await Habit.findAll({
    where: { userId, achievementId, isActive: true },
    attributes: ['id'], raw: true, transaction: t || undefined,
  })).map(x => x.id);
  if (!ids.length) return 0;

  if (modelHasAttr(HabitCompletion, 'pointsAwarded')) {
    const rows = await HabitCompletion.findAll({
      where: { userId, habitId: { [Op.in]: ids }, completedAt: { [Op.gte]: winStart, [Op.lt]: winEnd } },
      attributes: [[fn('COALESCE', fn('SUM', col('pointsAwarded')), 0), 'sumPoints']],
      raw: true, transaction: t || undefined,
    });
    return Number(rows?.[0]?.sumPoints || 0);
  } else {
    const c = await HabitCompletion.count({
      where: { userId, habitId: { [Op.in]: ids }, completedAt: { [Op.gte]: winStart, [Op.lt]: winEnd } },
      transaction: t || undefined,
    });
    return c; // fallback: 1 poin per completion
  }
}

// saldo user (dukung pointBalance / totalPoints)
async function getUserBalance(userId, t = null) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'pointBalance', 'totalPoints'],
    transaction: t || undefined, lock: t ? t.LOCK.UPDATE : undefined,
  });
  if (!user) throw new Error('User tidak ditemukan');
  const balance = Number(user.pointBalance ?? user.totalPoints ?? 0);
  return { user, balance };
}
async function setUserBalance(user, newBalance, t = null) {
  if (user.pointBalance !== undefined && user.pointBalance !== null) user.pointBalance = newBalance;
  else user.totalPoints = newBalance;
  await user.save({ transaction: t || undefined });
}

/* ========================== FINALISASI ========================== */
async function finalizeAchievement(achievementId, { forceStatus } = {}) {
  return sequelize.transaction(async (t) => {
    const a = await Achievement.findByPk(achievementId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!a) throw new Error('Achievement tidak ditemukan');

    const userId = a.userId;
    const { start, end } = await ensureWindowOnInstance(a, t);

    // idempotent jika model Claim tersedia
    if (AchievementClaim) {
      const existed = await AchievementClaim.findOne({
        where: { userId, achievementId },
        transaction: t, lock: t.LOCK.UPDATE,
      });
      if (existed) return existed;
    }

    const contributed = await sumContribInWindow(userId, a.id, start, end, t);
    const target = toInt(a.targetPoints);
    const shouldComplete = forceStatus
      ? forceStatus === 'COMPLETED'
      : (target > 0 && contributed >= target);

    let pointsGranted = 0, balanceBefore = null, balanceAfter = null;
    if (shouldComplete) {
      const { user, balance } = await getUserBalance(userId, t);
      pointsGranted = target;
      balanceBefore = balance;
      balanceAfter = balance + pointsGranted;
      await setUserBalance(user, balanceAfter, t);
    }

    // kalau model Claim tidak ada → jangan bikin 500, cukup update status card
    if (!AchievementClaim) {
      a.status = shouldComplete ? 'COMPLETED' : 'EXPIRED';
      await a.save({ transaction: t });
      return null;
    }

    const payload = {
      userId,
      achievementId: a.id,
      status: shouldComplete ? 'COMPLETED' : 'EXPIRED',
      claimedAt: new Date(),
      pointsGranted,
      balanceBefore,
      balanceAfter,
    };
    if (modelHasAttr(AchievementClaim, 'periodStart')) payload.periodStart = start;
    if (modelHasAttr(AchievementClaim, 'periodEnd'))   payload.periodEnd   = end;

    const claim = await AchievementClaim.create(payload, { transaction: t });

    a.status = shouldComplete ? 'COMPLETED' : 'EXPIRED';
    await a.save({ transaction: t });

    return claim;
  });
}

async function maybeFinalizeAchievement(a, userId) {
  const { start, end } = await ensureWindowOnInstance(a);
  const now = new Date();
  const target = toInt(a.targetPoints);
  const contributed = await sumContribInWindow(userId, a.id, start, end);

  if (a.status === 'ACTIVE') {
    if (target > 0 && contributed >= target && now <= end) {
      return finalizeAchievement(a.id, { forceStatus: 'COMPLETED' });
    }
    if (now > end) {
      const st = (target > 0 && contributed >= target) ? 'COMPLETED' : 'EXPIRED';
      return finalizeAchievement(a.id, { forceStatus: st });
    }
  }
  return null;
}

/* ========================== Endpoints ========================== */

// GET /achievements/active?type=daily|weekly
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

    const { start, end } = await ensureWindowOnInstance(card);
    try { await maybeFinalizeAchievement(card, userId); } catch (e) { console.warn('finalize skip:', e?.message); }
    await card.reload();

    const now = new Date();
    const inWindow = now >= (card.validFrom || start) && now <= (card.validTo || end);
    const canInteract = card.status === 'ACTIVE' && inWindow;

    return res.json({
      id: card.id,
      name: card.name,
      frequency: card.frequency,
      status: card.status,
      targetPoints: card.targetPoints,
      validFromUTC: card.validFrom || start,
      validToUTC: card.validTo || end,
      validFromWIB: fmtWIB(card.validFrom || start),
      validToWIB: fmtWIB(card.validTo || end),
      canInteract,
      habits: (card.Habits || []).map(h => ({
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

// POST /achievements/daily
async function createDaily(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const { name, targetPoints, description } = req.body || {};
    const tp = toInt(targetPoints);
    if (!name?.trim() || tp <= 0) { await t.rollback(); return res.status(400).json({ error: 'name & targetPoints wajib' }); }

    const attrs = Achievement?.rawAttributes || {};
    const body = {
      userId, name: name.trim(), frequency: 'Daily',
      targetPoints: tp, description: description || null,
      isActive: true, status: 'ACTIVE',
    };
    if (attrs.validFrom && attrs.validTo) {
      body.validFrom = wibStartOfDay();
      body.validTo = wibEndOfDay();
    }

    const ach = await Achievement.create(body, { transaction: t });
    await createRewardPairIfMissing(userId, ach, t);

    await t.commit();
    return res.status(201).json({ message: 'Daily dibuat', achievement: ach });
  } catch (err) {
    console.error('POST /achievements/daily error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal membuat daily' });
  }
}

// POST /achievements/weekly
async function createWeekly(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const { name, targetPoints, description } = req.body || {};
    const tp = toInt(targetPoints);
    if (!name?.trim() || tp <= 0) { await t.rollback(); return res.status(400).json({ error: 'name & targetPoints wajib' }); }

    const attrs = Achievement?.rawAttributes || {};
    const now = new Date();
    const start = now;
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const body = {
      userId, name: name.trim(), frequency: 'Weekly',
      targetPoints: tp, description: description || null,
      isActive: true, status: 'ACTIVE',
    };
    if (attrs.validFrom && attrs.validTo) {
      body.validFrom = start;
      body.validTo = end;
    }

    const ach = await Achievement.create(body, { transaction: t });
    await createRewardPairIfMissing(userId, ach, t);

    await t.commit();
    return res.status(201).json({ message: 'Weekly dibuat', achievement: ach });
  } catch (err) {
    console.error('POST /achievements/weekly error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal membuat weekly' });
  }
}

// (Compat) POST /achievements
async function createAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const { name, frequency = 'Daily', targetPoints, description, expiryDate } = req.body || {};
    if (!name || !['Daily', 'Weekly'].includes(frequency)) { await t.rollback(); return res.status(400).json({ error: 'name & frequency wajib (Daily/Weekly)' }); }
    const tp = toInt(targetPoints); if (tp <= 0) { await t.rollback(); return res.status(400).json({ error: 'targetPoints harus angka > 0' }); }

    const attrs = Achievement?.rawAttributes || {};
    const win = frequency === 'Weekly'
      ? { start: new Date(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 1) }
      : { start: wibStartOfDay(), end: wibEndOfDay() };

    const body = {
      userId: req.user.id, name: name.trim(), frequency,
      targetPoints: tp, description: description || null,
      expiryDate: expiryDate || null, isActive: true, status: 'ACTIVE',
    };
    if (attrs.validFrom && attrs.validTo) {
      body.validFrom = win.start; body.validTo = win.end;
    }

    const ach = await Achievement.create(body, { transaction: t });
    const reward = await createRewardPairIfMissing(req.user.id, ach, t);

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

// PUT /achievements/:id
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
      const tp = toInt(targetPoints); if (tp <= 0) return res.status(400).json({ error: 'targetPoints harus angka > 0' });
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

// DELETE /achievements/:id
async function deleteAchievement(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) { await t.rollback(); return res.status(400).json({ error: 'ID tidak valid' }); }

    const a = await Achievement.findOne({ where: { id, userId, isActive: true }, transaction: t, lock: t.LOCK.UPDATE });
    if (!a) { await t.rollback(); return res.status(404).json({ error: 'Achievement tidak ditemukan / sudah nonaktif' }); }

    a.isActive = false;
    await a.save({ transaction: t });
    await Reward.update({ isActive: false }, { where: { userId, achievementId: a.id }, transaction: t });

    await t.commit();
    return res.json({ message: 'Achievement dihapus (soft delete) & reward pairing dinonaktifkan' });
  } catch (err) {
    console.error('DELETE /achievements/:id error:', err);
    await t.rollback();
    return res.status(500).json({ error: 'Gagal menghapus achievement', detail: String(err?.message || err) });
  }
}

// GET /achievements
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
      const { start, end } = await ensureWindowOnInstance(a);
      try { await maybeFinalizeAchievement(a, req.user.id); } catch (e) { console.warn('finalize skip:', e?.message); }
      await a.reload();

      const habits = await Habit.findAll({
        where: { userId: req.user.id, achievementId: a.id, isActive: true },
        attributes: ['id','title','frequency','pointsPerCompletion'],
        order: [['createdAt','ASC']],
      });

      const contributed = await sumContribInWindow(req.user.id, a.id, a.validFrom || start, a.validTo || end);
      const target = Number(a.targetPoints || 0);
      const progressPercent = target > 0 ? Math.min(100, Math.round((contributed / target) * 100)) : 0;
      const remainingPoints = Math.max(0, target - contributed);
      const claimable = target > 0 && contributed >= target && now <= (a.validTo || end) && a.status === 'ACTIVE';

      out.push({
        id: a.id,
        name: a.name,
        frequency: a.frequency,
        targetPoints: target,
        description: a.description,
        expiryDate: a.expiryDate || null,
        isActive: a.isActive,
        status: a.status || computeStatusFor(a, now, contributed),
        createdAt: a.createdAt,
        createdAtWIB: fmtWIB(a.createdAt),
        window: {
          validFromUTC: a.validFrom || start,
          validToUTC: a.validTo || end,
          validFromWIB: fmtWIB(a.validFrom || start),
          validToWIB: fmtWIB(a.validTo || end),
          nowInWindow: now >= (a.validFrom || start) && now <= (a.validTo || end),
        },
        habits: habits.map(h => ({
          id: h.id, title: h.title, frequency: h.frequency, pointsPerCompletion: toInt(h.pointsPerCompletion),
        })),
        stats: { contributedPoints: contributed, progressPercent, remainingPoints, claimable },
      });
    }

    const onlyClaimable = String(req.query.claimable || '') === '1';
    const result = onlyClaimable ? out.filter(x => x.stats.claimable) : out;
    return res.json(result);
  } catch (err) {
    console.error('GET /achievements error:', err);
    return res.status(500).json({ error: 'Gagal mengambil achievements', detail: String(err?.message || err) });
  }
}

// GET /achievements/:id
async function getAchievementDetail(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });

    const a = await Achievement.findOne({ where: { id, userId: req.user.id } });
    if (!a) return res.status(404).json({ error: 'Achievement tidak ditemukan' });

    const { start, end } = await ensureWindowOnInstance(a);
    try { await maybeFinalizeAchievement(a, req.user.id); } catch (e) { console.warn('finalize skip:', e?.message); }
    await a.reload();

    const habits = await Habit.findAll({
      where: { userId: req.user.id, achievementId: a.id, isActive: true },
      attributes: ['id','title','frequency','pointsPerCompletion'],
      order: [['createdAt','ASC']],
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
      validFromUTC: a.validFrom || start,
      validToUTC: a.validTo || end,
      validFromWIB: fmtWIB(a.validFrom || start),
      validToWIB: fmtWIB(a.validTo || end),
      habits,
    });
  } catch (err) {
    console.error('GET /achievements/:id error:', err);
    return res.status(500).json({ error: 'Gagal mengambil detail achievement' });
  }
}

// POST /achievements/:id/habits
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

    // Buat habit mengikuti frequency card
    const habitBody = {
      userId: req.user.id,
      title: title.trim(),
      frequency: a.frequency,
      isActive: true,
      achievementId: a.id,
    };

    // Isi field poin sesuai skema model Habit
    if (modelHasAttr(Habit, 'pointsPerCompletion')) habitBody.pointsPerCompletion = p;
    else if (modelHasAttr(Habit, 'points')) habitBody.points = p;
    else habitBody.pointsPerCompletion = p; // default; kalau kolom tak ada, Sequelize abaikan

    const h = await Habit.create(habitBody);
    return res.status(201).json({ message: 'Habit ditambahkan', habit: h });
  } catch (err) {
    console.error('POST /achievements/:id/habits error:', err);
    return res.status(500).json({ error: 'Gagal menambah habit', detail: String(err?.message || err) });
  }
}

/* ========================== Util internal ========================== */
async function createRewardPairIfMissing(userId, ach, t = null) {
  const existed = await Reward.findOne({ where: { userId, achievementId: ach.id }, transaction: t || undefined });
  if (existed) return existed;
  return Reward.create({
    userId,
    name: ach.name,
    requiredPoints: Number(ach.targetPoints || 0),
    description: `Reward for achievement "${ach.name}"`,
    achievementId: ach.id,
    isActive: true,
    expiryDate: null,
  }, { transaction: t || undefined });
}

async function claimAchievement(_req, res) {
  return res.status(400).json({ error: 'Gunakan klaim melalui halaman Rewards' });
}

module.exports = {
  getActive,
  createDaily,
  createWeekly,
  createAchievement,
  listAchievements,
  getAchievementDetail,
  updateAchievement,
  deleteAchievement,
  addHabitToAchievement,
  claimAchievement,
  finalizeAchievement,
};
