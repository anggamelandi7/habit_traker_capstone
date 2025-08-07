const { Habit, Reward } = require('../models');

// Utility buat tanggal mundur x hari
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const seedDummyData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Hapus data sebelumnya (opsional)
    await Habit.destroy({ where: { userId } });
    await Reward.destroy({ where: { userId } });

    // Buat habit dummy
    const habitPromises = [];
    for (let i = 1; i <= 10; i++) {
      habitPromises.push(Habit.create({
        title: `Habit Dummy #${i}`,
        frequency: 'Daily',
        completed: true,
        userId,
        createdAt: daysAgo(i * 2),
        updatedAt: daysAgo(i * 2)
      }));
    }

    // Buat reward dummy
    const rewardPromises = [];
    for (let j = 1; j <= 3; j++) {
      rewardPromises.push(Reward.create({
        name: `Reward Dummy #${j}`,
        description: `Deskripsi reward dummy ${j}`,
        points: 10 * j,
        userId,
        createdAt: daysAgo(j * 4)
    }));
    }

    await Promise.all([...habitPromises, ...rewardPromises]);

    res.json({ message: '✅ Dummy data berhasil disimpan' });
  } catch (err) {
    console.error('Seeder error:', err);
    res.status(500).json({ error: 'Seeder gagal' });
  }
};

module.exports = { seedDummyData };
