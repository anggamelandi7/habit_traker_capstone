const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/', verifyToken, habitController.getAllHabits);
router.post('/', verifyToken, habitController.createHabit);
router.put('/:id', verifyToken, habitController.updateHabit);
router.delete('/:id', verifyToken, habitController.deleteHabit);
router.get('/summary', verifyToken, habitController.getHabitSummary);
router.get('/progress', verifyToken, habitController.getHabitProgress);
module.exports = router;
