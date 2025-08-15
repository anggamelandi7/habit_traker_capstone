
const { Sequelize, Habit, HabitCompletion, User, PointLedger } = require('../models');
const { Op } = Sequelize;
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc); dayjs.extend(tz);
const ZONE = 'Asia/Jakarta';

const completeHabit = async (req, res) => {
  const t = await Habit.sequelize.transaction();
  try {
    const userId = req.user.id;
    const habitId = +req.params.id;

    const habit = await Habit.findOne({
      where: { id: habitId, userId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!habit) {
      await t.rollback();
      return res.status(404).json({ error: 'Habit tidak ditemukan / nonaktif' });
    }

    const nowJkt = dayjs().tz(ZONE);
    const startOfDayJkt = nowJkt.startOf('day').toDate();
    const startOfWeekJkt = nowJkt.startOf('week').toDate();

    // Anti-cheat gating
    let already;
    if (habit.frequency === 'Daily') {
      already = await HabitCompletion.findOne({
        where: { userId, habitId, completedAt: { [Op.gte]: startOfDayJkt } },
        transaction: t
      });
      if (already) {
        await t.rollback();
        return res.status(400).json({ error: 'Habit sudah diselesaikan hari ini' });
      }
    } else if (habit.frequency === 'Weekly') {
      already = await HabitCompletion.findOne({
        where: { userId, habitId, completedAt: { [Op.gte]: startOfWeekJkt } },
        transaction: t
      });
      if (already) {
        await t.rollback();
        return res.status(400).json({ error: 'Habit sudah diselesaikan minggu ini' });
      }
    }

    const points = Number(habit.pointsPerCompletion) || 0;

    // Catat completion (event log)
    await HabitCompletion.create({
      userId, habitId,
      completedAt: dayjs().toDate(),
      pointsAwarded: points
    }, { transaction: t });

    // Update saldo user (pointBalance)
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    const newBalance = (Number(user.pointBalance) || 0) + points;
    await user.update({ pointBalance: newBalance }, { transaction: t });

    // Ledger +delta
    await PointLedger.create({
      userId,
      habitId,
      rewardId: null,
      delta: points,
      reason: `Completed habit: ${habit.title}`,
      balanceAfter: newBalance
    }, { transaction: t });

    await t.commit();
    return res.json({
      message: 'Habit selesai',
      addedPoints: points,
      newBalance
    });
  } catch (err) {
    await t.rollback();
    console.error('POST /habits/:id/complete error:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan habit' });
  }
};

module.exports = { completeHabit };