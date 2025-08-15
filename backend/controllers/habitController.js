
const { sequelize, Habit, User } = require('../models');


function formatLabelJakarta(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  const optsDate = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
  const optsTime = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: true };

  const datePart = new Intl.DateTimeFormat('en-GB', optsDate).format(d); // 10/08/2025
  const timePart = new Intl.DateTimeFormat('en-US', optsTime).format(d); // 03:28 PM
  const timePartDot = timePart.replace(':', '.'); // 03.28 PM

  return `${datePart} • ${timePartDot}`;
}

// Hitung endDate (DATEONLY "YYYY-MM-DD") dari startDate & frequency,
// perhitungan dilakukan dalam "kerangka" Asia/Jakarta agar +hari konsisten.
function computeEndDateDateOnly(startDate, frequency) {
  if (!startDate || !frequency) return null;

  const opts = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  };
  const parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(new Date(startDate));
  const get = (type) => parts.find(p => p.type === type)?.value;

  const y = Number(get('year'));
  const m = Number(get('month')); // 01..12
  const d = Number(get('day'));
  const hh = Number(get('hour'));
  const mm = Number(get('minute'));
  const ss = Number(get('second'));

  // Build sebagai UTC container agar operasi tanggal stabil
  const base = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  const plus = new Date(base);
  const f = String(frequency).toLowerCase();

  if (f === 'daily') plus.setUTCDate(plus.getUTCDate() + 1);
  else if (f === 'weekly') plus.setUTCDate(plus.getUTCDate() + 7);
  else if (f === 'monthly') plus.setUTCDate(plus.getUTCDate() + 30);
  else return null;

  const yyyy = plus.getUTCFullYear();
  const mm2 = String(plus.getUTCMonth() + 1).padStart(2, '0');
  const dd2 = String(plus.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm2}-${dd2}`;
}



const getAllHabits = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const habits = await Habit.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const shaped = habits.map(h => ({
      id: h.id,
      title: h.title,
      frequency: h.frequency,
      pointsPerCompletion: h.pointsPerCompletion,
      startDate: h.startDate,
      startLabel: formatLabelJakarta(h.startDate),
      endDate: h.endDate,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt
    }));

    return res.json(shaped);
  } catch (err) {
    console.error('GET /habits error:', err);
    // sementara tampilkan detail untuk debug cepat
    return res.status(500).json({ error: 'Gagal mengambil data habits', detail: String(err?.message || err) });
  }
};

const createHabit = async (req, res) => {
  try {
    const { title, frequency, pointsPerCompletion } = req.body;
    if (!title || !frequency) {
      return res.status(400).json({ error: 'title dan frequency wajib diisi' });
    }

    const startDate = new Date(); // realtime now (UTC)
    const endDate = computeEndDateDateOnly(startDate, frequency);

    const habit = await Habit.create({
      title,
      frequency,
      pointsPerCompletion: Number(pointsPerCompletion) || 0,
      startDate,
      endDate,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Habit dibuat',
      startLabel: formatLabelJakarta(habit.startDate),
      habit: {
        id: habit.id,
        title: habit.title,
        frequency: habit.frequency,
        pointsPerCompletion: habit.pointsPerCompletion,
        completed: habit.completed,
        startDate: habit.startDate,
        endDate: habit.endDate,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat habit' });
  }
};

const updateHabit = async (req, res) => {
  try {
    const id = +req.params.id;
    const { title, frequency, pointsPerCompletion, endDate, completed } = req.body;

    const habit = await Habit.findOne({ where: { id, userId: req.user.id } });
    if (!habit) return res.status(404).json({ error: 'Habit tidak ditemukan' });

    if (title !== undefined) habit.title = title;
    if (frequency !== undefined) {
      habit.frequency = frequency;
      if (endDate === undefined) {
        habit.endDate = computeEndDateDateOnly(habit.startDate, frequency);
      }
    }
    if (pointsPerCompletion !== undefined) {
      habit.pointsPerCompletion = Number(pointsPerCompletion) || 0;
    }
    if (endDate !== undefined) habit.endDate = endDate; // manual override


    await habit.save();

    res.json({
      message: 'Habit diupdate',
      startLabel: formatLabelJakarta(habit.startDate),
      habit: {
        id: habit.id,
        title: habit.title,
        frequency: habit.frequency,
        pointsPerCompletion: habit.pointsPerCompletion,
        completed: habit.completed,
        startDate: habit.startDate,
        endDate: habit.endDate,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt
      }
    });
  } catch (err) {
    console.error('PUT /habits/:id error:', err);
    res.status(500).json({ error: 'Gagal mengupdate habit' });
  }
};

const deleteHabit = async (req, res) => {
  try {
    const id = +req.params.id;
    const deleted = await Habit.destroy({ where: { id, userId: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Habit tidak ditemukan' });
    res.json({ message: 'Habit dihapus' });
  } catch (err) {
    console.error('DELETE /habits/:id error:', err);
    res.status(500).json({ error: 'Gagal menghapus habit' });
  }
};

/**
 * POST /habits/:id/complete
 * - Catat ke HabitLog (userId, habitId, points, loggedAt)
 * - Tambah user.totalPoints secara atomik (transaction)
 */
const completeHabit = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = +req.params.id;
    const userId = req.user.id;

    const habit = await Habit.findOne({
      where: { id, userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!habit) {
      await t.rollback();
      return res.status(404).json({ error: 'Habit tidak ditemukan' });
    }

    const points = Number(habit.pointsPerCompletion) || 0;

    const log = await HabitLog.create({
      habitId: habit.id,
      userId,
      points,
      loggedAt: new Date()
    }, { transaction: t });

    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    user.totalPoints = (Number(user.totalPoints) || 0) + points;
    await user.save({ transaction: t });

    await t.commit();
    res.json({
      message: 'Habit diselesaikan, poin bertambah',
      addedPoints: points,
      totalPoints: user.totalPoints,
      log
    });
  } catch (err) {
    console.error('POST /habits/:id/complete error:', err);
    await t.rollback();
    res.status(500).json({ error: 'Gagal menyelesaikan habit' });
  }
};

module.exports = {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
};
