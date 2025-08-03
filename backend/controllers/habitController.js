const { Habit, Reward } = require('../models');

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

// POST habit baru dengan userId dari token
const createHabit = async (req, res) => {
    try {
        const { title, frequency } = req.body;
        const userId = req.user.id;
        
        const newHabit = await Habit.create({
            title,
            frequency,
            userId 
        });

        res.status(201).json(newHabit);
    } catch (err) {
        res.status(500).json({ error: 'Gagal membuat habit' });
    }
};


// UPDATE habit + Tambahkan reward jika completed berubah dari false menjadi true
const updateHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const habit = await Habit.findByPk(id);
        if (!habit) return res.status(404).json({ error: 'Habit tidak ditemukan' });

        const { title, frequency, completed } = req.body;

        // Cek apakah habit sebelumnya belum selesai
        const wasCompleted = habit.completed;

        // Update data habit
        habit.title = title ?? habit.title;
        habit.frequency = frequency ?? habit.frequency;
        habit.completed = completed ?? habit.completed;

        await habit.save();

        // Jika user menyelesaikan habit sekarang (dari false → true), buat reward
        if (!wasCompleted && completed === true) {
      try {
        await Reward.create({
            name: `Reward "${habit.title}"`,
            description: `Reward for completing habit "${habit.title}"`,points: 10,
            userId: req.user.id
        });
        console.log('Reward berhasil ditambahkan');
      } catch (err) {
        console.error('Gagal menambahkan reward:', err);
      }
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

module.exports = {
    getAllHabits,
    createHabit,
    updateHabit,
    deleteHabit
};
