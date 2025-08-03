const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/', verifyToken, rewardController.getUserRewards);
router.get('/total', verifyToken, rewardController.getTotalPoints);


module.exports = router;
