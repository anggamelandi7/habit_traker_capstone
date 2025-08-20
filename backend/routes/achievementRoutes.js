// backend/routes/achievementRoutes.js
const express = require('express');
const router = express.Router();

const authMod = require('../middlewares/authMiddleware');
const verifyToken = (typeof authMod === 'function') ? authMod : authMod.verifyToken;

const {
  createAchievement,
  listAchievements,
  getAchievementDetail,
  addHabitToAchievement,
  claimAchievement,
  updateAchievement,
  deleteAchievement,
} = require('../controllers/achievementController');

function validateIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID tidak valid' });
  }
  next();
}

// CREATE
router.post('/', verifyToken, createAchievement);

// LIST (default: hanya active; pakai ?includeInactive=1 untuk melihat yang nonaktif/expired)
router.get('/', verifyToken, listAchievements);

// DETAIL
router.get('/:id', verifyToken, validateIdParam, getAchievementDetail);

// ADD HABIT to achievement
router.post('/:id/habits', verifyToken, validateIdParam, addHabitToAchievement);

// CLAIM (sesuai desain: gunakan Rewards → 400)
router.post('/:id/claim', verifyToken, validateIdParam, claimAchievement);

// UPDATE (nama/targetPoints/description)
router.put('/:id', verifyToken, validateIdParam, updateAchievement);

// DELETE (soft delete → isActive=false)
router.delete('/:id', verifyToken, validateIdParam, deleteAchievement);

module.exports = router;
