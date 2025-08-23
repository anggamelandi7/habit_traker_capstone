const { Op, fn, col } = require('sequelize');
const {
  PointLedger,
  Habit,
  Reward,
  HabitCompletion,
  Achievement,
  User,
} = require('../models');
// pastikan file utils/period mengekspor fmtWIB
const { fmtWIB } = require('../utils/period'); 

// ======================= Helpers =======================

function parsePageLimit(q) {
  const page = Math.max(1, parseInt(q.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildRange(q) {
  // range untuk field bertipe DATE (UTC) — inclusive 1 hari via 00:00–23:59
  const where = {};
  const { startDate, endDate } = q || {};
  if (startDate || endDate) {
    where[Op.and] = [];
    if (startDate) where[Op.and].push({ [Op.gte]: new Date(`${startDate}T00:00:00.000Z`) });
    if (endDate)   where[Op.and].push({ [Op.lte]: new Date(`${endDate}T23:59:59.999Z`) });
  }
  return where;
}

// ======================= Controllers =======================

/**
 * GET /history/ledger
 * Query: page, limit, startDate, endDate, type? (habit|reward|achievement|adjustment)
 * Sumber: PointLedger (+ Habit, Reward)
 */
async function getLedger(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { page, limit, offset } = parsePageLimit(req.query);

    const where = { userId: req.user.id };
    const range = buildRange(req.query);
    if (Object.keys(range).length) where.createdAt = range;

    // filter type opsional
    if (req.query.type) {
      const t = String(req.query.type).toLowerCase();
      if (t === 'habit') where.refType = 'Habit';
      else if (t === 'reward') where.refType = 'Reward';
      else if (t === 'achievement') where.refType = 'Achievement';
      else if (t === 'adjustment') where.refType = null; // sesuai skema kamu
    }

    const { rows, count } = await PointLedger.findAndCountAll({
      where,
      include: [
        { model: Habit, attributes: ['id', 'title'], required: false },
        { model: Reward, attributes: ['id', 'name', 'requiredPoints'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const items = rows.map((r) => {
      let type = 'adjustment';
      if (r.HabitId || r.Habit) type = 'habit';
      if (r.RewardId || r.Reward) type = 'reward';
      if (r.refType === 'Achievement') type = 'achievement';

      return {
        id: r.id,
        atUTC: r.createdAt,
        atWIB: fmtWIB(r.createdAt),
        type,
        reason: r.reason,
        delta: Number(r.delta),
        balanceAfter: Number(r.balanceAfter),
        habit: r.Habit ? { id: r.Habit.id, title: r.Habit.title } : null,
        reward: r.Reward
          ? {
              id: r.Reward.id,
              name: r.Reward.name,
              requiredPoints: Number(r.Reward.requiredPoints || 0),
            }
          : null,
        refType: r.refType || null,
        refId: r.refId || null,
      };
    });

    const credits = items.filter((i) => i.delta > 0).reduce((a, b) => a + b.delta, 0);
    const debits = items.filter((i) => i.delta < 0).reduce((a, b) => a + Math.abs(b.delta), 0);
    const endingBalance = items.length ? items[0].balanceAfter : null;
    const startingBalance = items.length
      ? items[items.length - 1].balanceAfter - items[items.length - 1].delta
      : null;

    res.json({
      page,
      limit,
      total: count,
      summary: {
        startingBalance: startingBalance ?? 0,
        endingBalance: endingBalance ?? 0,
        credits,
        debits,
      },
      items,
    });
  } catch (err) {
    console.error('GET /history/ledger error:', err);
    res
      .status(500)
      .json({ error: 'Gagal mengambil ledger', detail: String(err?.message || err) });
  }
}

/**
 * GET /history/habits
 * Query: page, limit, startDate, endDate, habitId?, frequency?(Daily|Weekly)
 * Sumber: HabitCompletion -> Habit -> Achievement (nested include)
 */
async function getHabitCompletions(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { page, limit, offset } = parsePageLimit(req.query);
    const where = { userId: req.user.id };
    const { startDate, endDate, habitId, frequency } = req.query;

    // filter tanggal (completedAt)
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate)   where.completedAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (habitId) where.habitId = Number(habitId);

    // include Habit (+ Achievement via Habit)
    const habitInclude = {
      model: Habit,
      attributes: ['id', 'title', 'frequency', 'achievementId'],
      required: true,
      include: [
        {
          model: Achievement,
          attributes: ['id', 'name', 'frequency'],
          required: false,
        },
      ],
    };
    if (frequency === 'Daily' || frequency === 'Weekly') {
      habitInclude.where = { frequency };
    }

    const { rows, count } = await HabitCompletion.findAndCountAll({
      where,
      include: [habitInclude],
      order: [['completedAt', 'DESC']],
      limit,
      offset,
    });

    const items = rows.map((r) => {
      const h = r.Habit;
      const a = h?.Achievement;
      return {
        id: r.id,
        completedAtUTC: r.completedAt,
        completedAtWIB: fmtWIB(r.completedAt),
        pointsAwarded: Number(r.pointsAwarded || 0),
        habit: h
          ? {
              id: h.id,
              title: h.title,
              frequency: h.frequency,
            }
          : null,
        achievement: a
          ? {
              id: a.id,
              name: a.name,
              frequency: a.frequency,
            }
          : null,
      };
    });

    const totalPointsAwarded = items.reduce((a, b) => a + b.pointsAwarded, 0);
    // agregasi by habit
    const byHabitMap = new Map();
    items.forEach((i) => {
      const key = i.habit?.id || 'unknown';
      if (!byHabitMap.has(key)) {
        byHabitMap.set(key, {
          habitId: i.habit?.id || null,
          title: i.habit?.title || '(unknown)',
          count: 0,
          points: 0,
        });
      }
      const agg = byHabitMap.get(key);
      agg.count += 1;
      agg.points += i.pointsAwarded;
    });
    const byHabit = Array.from(byHabitMap.values());

    // distinct days (WIB) dari completedAt
    const daySet = new Set();
    for (const i of items) {
      const d = new Date(i.completedAtUTC);
      const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d); // YYYY-MM-DD
      daySet.add(ymd);
    }
    const daysActive = daySet.size;

    res.json({
      page,
      limit,
      total: count,
      summary: { totalPointsAwarded, daysActive, byHabit },
      items,
    });
  } catch (err) {
    console.error('GET /history/habits error:', err);
    res.status(500).json({
      error: 'Gagal mengambil riwayat habits',
      detail: String(err?.message || err),
    });
  }
}

/**
 * GET /history/rewards/claims
 * Query: page, limit, startDate, endDate
 * Sumber: PointLedger (refType='Reward' dan delta<0) + Reward
 */
async function getRewardClaims(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { page, limit, offset } = parsePageLimit(req.query);

    const where = {
      userId: req.user.id,
      refType: 'Reward',
      delta: { [Op.lt]: 0 },
    };

    const range = buildRange(req.query);
    if (Object.keys(range).length) where.createdAt = range;

    const { rows, count } = await PointLedger.findAndCountAll({
      where,
      include: [
        {
          model: Reward,
          attributes: ['id', 'name', 'requiredPoints'],
          required: true,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const items = rows.map((r) => ({
      id: r.id,
      claimedAtUTC: r.createdAt,
      claimedAtWIB: fmtWIB(r.createdAt),
      reward: {
        id: r.Reward.id,
        name: r.Reward.name,
        requiredPoints: Number(r.Reward.requiredPoints || 0),
      },
      cost: Math.abs(Number(r.delta || 0)),
      balanceAfter: Number(r.balanceAfter || 0),
      ledgerReason: r.reason || null,
    }));

    res.json({ page, limit, total: count, items });
  } catch (err) {
    console.error('GET /history/rewards/claims error:', err);
    res.status(500).json({
      error: 'Gagal mengambil klaim reward',
      detail: String(err?.message || err),
    });
  }
}

module.exports = {
  getLedger,
  getHabitCompletions,
  getRewardClaims,
};
