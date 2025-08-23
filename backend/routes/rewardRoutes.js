// backend/routes/rewardRoutes.js
const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authMiddleware');
const rewardController = require('../controllers/rewardController');

// Lindungi semua endpoint rewards
router.use(verifyToken);

/**
 * Katalog rewards (milik user) + flag claimable + saldo
 * GET /rewards
 */
router.get('/', rewardController.listRewards);

/**
 * Ringkasan saldo/total poin
 * GET /rewards/total
 */
router.get('/total', rewardController.getTotalPoints);

/**
 * Riwayat klaim dari ledger userRewards
 * GET /rewards/history
 */
router.get('/history', rewardController.getRewardHistory);

/**
 * (Opsional/legacy) Daftar reward milik user (tanpa flag claimable)
 * GET /rewards/user
 */
router.get('/user', rewardController.getUserRewards);

/**
 * Buat reward baru (katalog)
 * POST /rewards
 */
router.post('/', rewardController.createReward);

/**
 * Klaim reward (kurangi poin, catat ke userRewards, kunci reward)
 * POST /rewards/:id/claim
 * paling akhir agar tidak bentrok dengan path statis
 */
router.post('/:id/claim', rewardController.claimReward);

module.exports = router;
