const router = require('express').Router();
const verifyToken = require('../middlewares/authMiddleware');
const {
  createAchievement,
  listAchievements,
  addHabitToAchievement,
  getAchievementDetail,
  claimAchievement
} = require('../controllers/achievementController');

router.post('/', verifyToken, createAchievement);
router.get('/', verifyToken, listAchievements);
router.get('/:id', verifyToken, getAchievementDetail);
router.post('/:id/habits', verifyToken, addHabitToAchievement);
router.post('/:id/claim', verifyToken, claimAchievement);

module.exports = router;
