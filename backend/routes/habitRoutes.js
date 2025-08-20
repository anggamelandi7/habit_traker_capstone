// backend/routes/habitRoutes.js
const express = require('express');
const router = express.Router();

// Dukung 2 gaya export: default function atau { verifyToken }
const authMod = require('../middlewares/authMiddleware');
const verifyToken = (typeof authMod === 'function') ? authMod : authMod.verifyToken;

// Controller
const ctrl = require('../controllers/habitController');

// Validator ID param sederhana
function validateIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Habit ID tidak valid' });
  }
  next();
}

// --- ROUTES ---

// IMPORTANT: definisikan path statis dulu sebelum param :id
router.get('/grouped', verifyToken, ctrl.listHabitsGrouped);

// Flat atau grouped via query (?grouped=true)
router.get('/', verifyToken, ctrl.listHabits);

// Selesai (anti-cheat per periode)
router.post('/:id/complete', verifyToken, validateIdParam, ctrl.completeHabit);

// Edit
router.put('/:id', verifyToken, validateIdParam, ctrl.updateHabit);

// Hapus (soft delete -> isActive = false)
router.delete('/:id', verifyToken, validateIdParam, ctrl.deleteHabit);

module.exports = router;
