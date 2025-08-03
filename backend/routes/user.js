const express = require("express");
const UserController = require("../controllers/UserController");
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

router.get('/me', verifyToken, UserController.getProfile);

module.exports = router
