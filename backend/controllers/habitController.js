const Habit = require('../models/Habit');

// UNTUK GET all Habit / AMBIL SEMUA

const getAllHabits = async (req, res) => {
    try {
        const habits = await Habit.findAll();
        res.json(habits);
    } catch (err) {
        res.status(500).json({error: 'Failed to fetch habits'});
    }
};

// UNTUK new Habit / TAMBAH BARU
const createHabit = async (req, res) => {
    try {
        const {title, frequency} = req.body;

        const newHabit = await Habit.create({
            title,
            frequency
        });

        res.status(201).json(newHabit);
    } catch (err) {
        res.status(500).json({error: 'Failed to fetch habits'});
    }
};

// UNTUK update Habit / edit Habit
const updateHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, frequency, is_completed } = req.body;


        const habit = await Habit.findByPk(id);
        if(!habit) return res.status(404).json({ error: 'Habit not found'});

        habit.title = title || habit.title;
        habit.frequency = frequency || habit.frequency;
        habit.is_completed = typeof is_completed === 'boolean' ? is_completed : habit.is_completed;


        await habit.save();

        res.json(habit);
    }catch (error) {
        res.status(500).json({ error: 'failed to update habit'});
    }
};

// UNTUK delete Habit / hapus Habit
const deleteHabit = async (req, res) => {
    try {
        const { id } = req.params;

        const habit = await Habit.findByPk(id);
        if(!habit) return res.status(404).json({ error: 'Habit not found'});

        await habit.destroy();
        res.json({ message: 'Habit deleted successfully' });
    }catch (error) {
        res.status(500).json({ error: 'failed to delete habit'});
    }
};


    module.exports = {
        getAllHabits,
        createHabit,
        updateHabit,
        deleteHabit
    };