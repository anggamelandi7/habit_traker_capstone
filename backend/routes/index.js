const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");

const habitController = require("../controllers/habitController");
const rewardController = require("../controllers/rewardController");
const pointController = require("../controllers/pointController");

// Health check (opsional)
router.get("/health", (req, res) => res.json({ ok: true }));

// Habits
router.get("/habits", verifyToken, habitController.getAllHabits);
router.post("/habits", verifyToken, habitController.createHabit);
router.put("/habits/:id", verifyToken, habitController.updateHabit);
router.delete("/habits/:id", verifyToken, habitController.deleteHabit);
router.post("/habits/:id/complete", verifyToken, habitController.completeHabit);

// Rewards
router.get("/rewards", verifyToken, rewardController.getUserRewards);
router.post("/rewards", verifyToken, rewardController.createReward);
router.patch("/rewards/:id/claim", verifyToken, rewardController.claimReward);
router.get(
  "/rewards/claimable",
  verifyToken,
  rewardController.getClaimableRewards
);

// Points / Ledger
router.get("/points/me", verifyToken, pointController.getMyPoints);
router.get("/points/ledger", verifyToken, pointController.getLedger);

module.exports = router;
