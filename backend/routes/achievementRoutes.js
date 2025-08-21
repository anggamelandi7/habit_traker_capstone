const express = require('express');
const router = express.Router();

const authMod = require('../middlewares/authMiddleware');
const verifyToken = (typeof authMod === 'function') ? authMod : authMod.verifyToken;

const {
  getActive,
  createDaily,
  createWeekly,
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

router.get('/active', verifyToken, getActive);
router.post('/daily', verifyToken, createDaily);
router.post('/weekly', verifyToken, createWeekly);
router.post('/', verifyToken, createAchievement);
router.get('/', verifyToken, listAchievements);
router.get('/:id', verifyToken, validateIdParam, getAchievementDetail);
router.post('/:id/habits', verifyToken, validateIdParam, addHabitToAchievement);
router.post('/:id/claim', verifyToken, validateIdParam, claimAchievement);
router.put('/:id', verifyToken, validateIdParam, updateAchievement);
router.delete('/:id', verifyToken, validateIdParam, deleteAchievement);

module.exports = router;
