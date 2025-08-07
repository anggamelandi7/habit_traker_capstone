const { Habit, User, RewardClaim } = require('../models');
const { Op } = require("sequelize");

// GET semua habit milik user yang login
const getAllHabits = async (req, res) => {
  try {
    const habits = await Habit.findAll({
      where: { userId: req.user.id }
    });
    res.json(habits);
  } catch (err) {
    console.error('GET /habits error:', err);
    res.status(500).json({ error: 'Gagal mengambil data habits' });
  }
};

// POST habit baru
const createHabit = async (req, res) => {
  try {
    const { title, frequency, startDate, endDate } = req.body;
    const userId = req.user.id;

    const newHabit = await Habit.create({
      title,
      frequency,
      startDate,
      endDate,
      userId
    });

    res.status(201).json(newHabit);
  } catch (err) {
    console.error('❌ ERROR CREATE HABIT:', err);
    res.status(500).json({ error: 'Gagal membuat habit' });
  }
};

// PUT: update habit dan berikan point jika selesai
const updateHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findByPk(id);
    if (!habit) return res.status(404).json({ error: 'Habit tidak ditemukan' });

    const { title, frequency, completed } = req.body;
const wasCompleted = habit.completed;

habit.title = title ?? habit.title;
habit.frequency = frequency ?? habit.frequency;
habit.completed = completed ?? habit.completed;

await habit.save();

// ✅ Jika habit diselesaikan (dari false → true)
if (!wasCompleted && completed === true) {
  const user = await User.findByPk(req.user.id);

  const freqValue = frequency ?? habit.frequency; // 🛠️ fallback fix
  const pointsEarned = freqValue === 'Daily' ? 10 : 50;

  user.totalPoints += pointsEarned;
  await user.save();

  await RewardClaim.create({
    userId: user.id,
    rewardName: `Auto Point for "${habit.title}"`,
    points: pointsEarned
  });

  console.log(`✅ ${pointsEarned} poin ditambahkan untuk ${user.username}`);
}

    res.json(habit);
  } catch (error) {
    console.error('PUT /habits/:id error:', error);
    res.status(500).json({ error: 'Gagal mengupdate habit' });
  }
};

// DELETE habit
const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findByPk(id);
    if (!habit) return res.status(404).json({ error: 'Habit tidak ditemukan' });

    await habit.destroy();
    res.json({ message: 'Habit berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus habit' });
  }
};

// GET /habits/summary
const getHabitSummary = async (req, res) => {
  try {
    const allHabits = await Habit.findAll({ where: { userId: req.user.id } });
    const total = allHabits.length;
    const completed = allHabits.filter(h => h.completed).length;
    const pending = total - completed;

    res.json({ total, completed, pending });
  } catch (err) {
    console.error('GET /habits/summary error:', err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan habit' });
  }
};

// GET /habits/progress
const getHabitProgress = async (req, res) => {
  try {
    const habits = await Habit.findAll({
      where: {
        userId: req.user.id,
        completed: true
      },
      attributes: ['updatedAt']
    });

    const grouped = {};
    habits.forEach(habit => {
      const date = new Date(habit.updatedAt);
      const week = `${date.getFullYear()}-W${getWeekNumber(date)}`;
      if (!grouped[week]) grouped[week] = 0;
      grouped[week]++;
    });

    const result = Object.entries(grouped).map(([week, count]) => ({
      week,
      completed: count
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /habits/progress error:', err);
    res.status(500).json({ error: 'Gagal mengambil data progres habit' });
  }
};

// Helper: Week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitSummary,
  getHabitProgress
};
