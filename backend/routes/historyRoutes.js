const express = require('express');
const router = express.Router();

const authMod = require('../middlewares/authMiddleware');
const verifyToken = (typeof authMod === 'function') ? authMod : authMod.verifyToken;

const {
  getLedger,
  getHabitCompletions,
  getRewardClaims,
} = require('../controllers/historyController');

// Ledger (semua transaksi poin)
router.get('/ledger', verifyToken, getLedger);

// Habit completions
router.get('/habits', verifyToken, getHabitCompletions);

// Reward claims
router.get('/rewards/claims', verifyToken, getRewardClaims);

module.exports = router;
