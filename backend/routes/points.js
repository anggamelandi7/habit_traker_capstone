const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const { getUserLedgerDetailed } = require('../controllers/pointsController');

router.get('/ledger', verifyToken, getUserLedgerDetailed);

module.exports = router;