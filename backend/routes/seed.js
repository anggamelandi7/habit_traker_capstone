const express = require('express');
const router = express.Router();
const { seedDummyData } = require('../controllers/seedController');
const verifyToken = require('../middlewares/authMiddleware');

router.post('/', verifyToken, seedDummyData);

module.exports = router;
