const express = require('express');
const router = express.Router();

// middleware auth (default export function)
const verifyToken = require('../middlewares/authMiddleware');

// pastikan path controller sesuai nama file yang kamu pakai
const rewardController = require('../controllers/rewardController');

// CREATE reward
router.post('/', verifyToken, rewardController.createReward);

// Daftar reward aktif + claimable + balance
router.get('/', verifyToken, rewardController.listRewards);

// Riwayat reward milik user (semua reward yang ia buat)
router.get('/user', verifyToken, rewardController.getUserRewards);

// Total poin user
router.get('/total', verifyToken, rewardController.getTotalPoints);

// Klaim reward (mengurangi poin & mengunci reward)
router.post('/:id/claim', verifyToken, rewardController.claimReward);

module.exports = router;
