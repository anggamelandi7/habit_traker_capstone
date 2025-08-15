const express = require("express");
const router = express.Router();

const habitController = require("../controllers/habitController");
const { completeHabit } = require("../controllers/habitCompleteController");
const verifyToken = require("../middlewares/authMiddleware");

// CRUD Habit (pastikan ke-4 handler ini ada di habitController)
router.get("/", verifyToken, habitController.getAllHabits);
router.post("/", verifyToken, habitController.createHabit);
router.put("/:id", verifyToken, habitController.updateHabit);
router.delete("/:id", verifyToken, habitController.deleteHabit);


router.post(
  "/:id/complete",
  verifyToken,
  (req, res, next) => {
    if (Number.isNaN(Number(req.params.id))) {
      return res.status(400).json({ error: "Habit ID tidak valid" });
    }
    next();
  },
  completeHabit
);
// router.get("/summary", verifyToken, habitController.getHabitSummary);
// router.get("/progress", verifyToken, habitController.getHabitProgress);

module.exports = router;
