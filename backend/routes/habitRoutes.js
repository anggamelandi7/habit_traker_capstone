const express = require('express');
const router = express.Router();

const authMod = require('../middlewares/authMiddleware');
const verifyToken = (typeof authMod === 'function') ? authMod : authMod.verifyToken;

const ctrl = require('../controllers/habitController');

function validateIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Habit ID tidak valid' });
  }
  next();
}

// path statis dulu
router.get('/grouped', verifyToken, ctrl.listHabitsGrouped);
router.get('/', verifyToken, ctrl.listHabits);

// STRICT: selesai hanya bila di dalam window kartu
router.post('/:id/complete', verifyToken, validateIdParam, ctrl.completeHabit);

// Edit / Hapus
router.put('/:id', verifyToken, validateIdParam, ctrl.updateHabit);
router.delete('/:id', verifyToken, validateIdParam, ctrl.deleteHabit);

module.exports = router;
