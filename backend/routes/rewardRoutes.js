const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/', verifyToken, rewardController.getAllRewards);
router.post('/claim/:id', verifyToken, rewardController.claimReward);
router.get('/history', verifyToken, rewardController.getRewardHistory);


module.exports = router;
