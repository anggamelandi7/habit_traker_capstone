// backend/routes/rewardRoutes.js
const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authMiddleware'); // default export => function
const rewardController = require('../controllers/rewardClaimController'); // unified controller

// CREATE reward
router.post('/', verifyToken, rewardController.createReward);

// Daftar reward aktif + flag claimable (berdasarkan saldo poin user)
router.get('/', verifyToken, rewardController.listRewards);

// Riwayat reward milik user (semua reward yang ia buat)
router.get('/user', verifyToken, rewardController.getUserRewards);

// Total poin user (tampilkan pointBalance, fallback totalPoints jika masih ada)
router.get('/total', verifyToken, rewardController.getTotalPoints);

// Klaim reward (akan mengurangi poin jika cukup)
router.post('/:id/claim', verifyToken, rewardController.claimReward);

module.exports = router;
