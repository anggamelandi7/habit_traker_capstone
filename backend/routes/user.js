const express = require("express");
const UserController = require("../controllers/UserController");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");

// profil
router.get("/me", verifyToken, UserController.getProfile);

// kelola profil
router.patch("/me", verifyToken, UserController.updateUsername);
router.post("/change-password", verifyToken, UserController.changePassword);

module.exports = router;
