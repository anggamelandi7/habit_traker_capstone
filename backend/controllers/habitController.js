const { Op, fn, col } = require("sequelize");
const { sequelize, Habit, Achievement, HabitCompletion } = require("../models");
const { addPointsAtomic } = require("../services/pointsService");
const { getEffectiveFrequency } = require("../helpers/frequency");
const { getCurrentWindowWIB, getWindowMetaWIB, fmtWIB } = require("../utils/period");

/* =========================
   Helpers
========================= */
const toInt = (n, d = 0) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
};

async function sumContribInWindow(userId, achievementId, winStart, winEnd, t = null) {
  const ids = (
    await Habit.findAll({
      where: { achievementId, isActive: true },
      attributes: ["id"],
      raw: true,
      transaction: t || undefined,
    })
  ).map((x) => x.id);

  if (!ids.length) return 0;

  const rows = await HabitCompletion.findAll({
    where: {
      userId,
      habitId: { [Op.in]: ids },
      completedAt: { [Op.gte]: winStart, [Op.lt]: winEnd },
    },
    attributes: [[fn("COALESCE", fn("SUM", col("pointsAwarded")), 0), "sumPoints"]],
    raw: true,
    transaction: t || undefined,
  });
  return Number(rows?.[0]?.sumPoints || 0);
}

/* =========================
   GET /habits (?grouped=true)
========================= */
async function listHabits(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

    const grouped = String(req.query.grouped || "").toLowerCase() === "true";

    // hanya yang aktif
    const habits = await Habit.findAll({
      where: { userId: req.user.id, isActive: true },
      include: [
        { model: Achievement, attributes: ["id", "name", "frequency", "createdAt", "status", "validFrom", "validTo"], required: false },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!grouped) {
      return res.json(habits);
    }

    const dailyWin = getWindowMetaWIB("Daily");
    const weeklyWin = getWindowMetaWIB("Weekly");

    const daily = [];
    const weekly = [];

    for (const h of habits) {
      const effFreq = getEffectiveFrequency(h, h.Achievement);
      const { periodStart, periodEnd } = getCurrentWindowWIB(effFreq);

      const already = await HabitCompletion.findOne({
        where: {
          userId: req.user.id,
          habitId: h.id,
          completedAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd },
        },
        order: [["completedAt", "DESC"]],
        attributes: ["id", "completedAt"],
      });

      // strict discipline: hormati window & status kartu jika ada
      let canComplete = !already;
      let periodEndWIB = effFreq === "Weekly" ? weeklyWin.endWIB : dailyWin.endWIB;

      if (h.Achievement) {
        const now = new Date();
        const inWindow = h.Achievement.validFrom && h.Achievement.validTo
          ? now >= h.Achievement.validFrom && now <= h.Achievement.validTo
          : true; // fallback kompat

        if (h.Achievement.status && h.Achievement.status !== "ACTIVE") canComplete = false;
        if (!inWindow) canComplete = false;
      }

      const item = {
        id: h.id,
        title: h.title,
        pointsPerCompletion: toInt(h.pointsPerCompletion),
        achievementId: h.achievementId || null,
        achievementName: h.Achievement ? h.Achievement.name : null,
        achievementCreatedAtWIB: h.Achievement?.createdAt ? fmtWIB(h.Achievement.createdAt) : null,
        frequency: effFreq,
        status: already ? "done" : "pending",
        canComplete,
        lastCompletedAt: already?.completedAt || null,
        lastCompletedAtWIB: already ? fmtWIB(already.completedAt) : null,
        periodEndWIB,
      };

      (effFreq === "Weekly" ? weekly : daily).push(item);
    }

    const sortFn = (a, b) =>
      (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1);
    daily.sort(sortFn);
    weekly.sort(sortFn);

    return res.json({
      daily,
      weekly,
      meta: {
        daily: { startWIB: dailyWin.startWIB, endWIB: dailyWin.endWIB },
        weekly: { startWIB: weeklyWin.startWIB, endWIB: weeklyWin.endWIB },
      },
    });
  } catch (err) {
    console.error("GET /habits error:", err);
    res.status(500).json({ error: "Gagal mengambil data habits", detail: String(err?.message || err) });
  }
}

/* =========================
   GET /habits/grouped (PASTI grouped)
========================= */
async function listHabitsGrouped(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

    const habits = await Habit.findAll({
      where: { userId: req.user.id, isActive: true },
      include: [
        { model: Achievement, attributes: ["id", "name", "frequency", "createdAt", "status", "validFrom", "validTo"], required: false },
      ],
      order: [["createdAt", "DESC"]],
    });

    const dailyWin = getWindowMetaWIB("Daily");
    const weeklyWin = getWindowMetaWIB("Weekly");

    const daily = [];
    const weekly = [];

    for (const h of habits) {
      const effFreq = getEffectiveFrequency(h, h.Achievement);
      const { periodStart, periodEnd } = getCurrentWindowWIB(effFreq);

      const already = await HabitCompletion.findOne({
        where: {
          userId: req.user.id,
          habitId: h.id,
          completedAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd },
        },
        order: [["completedAt", "DESC"]],
        attributes: ["id", "completedAt"],
      });

      let canComplete = !already;
      let periodEndWIB = effFreq === "Weekly" ? weeklyWin.endWIB : dailyWin.endWIB;
      if (h.Achievement) {
        const now = new Date();
        const inWindow = h.Achievement.validFrom && h.Achievement.validTo
          ? now >= h.Achievement.validFrom && now <= h.Achievement.validTo
          : true;
        if (h.Achievement.status && h.Achievement.status !== "ACTIVE") canComplete = false;
        if (!inWindow) canComplete = false;
      }

      const item = {
        id: h.id,
        title: h.title,
        pointsPerCompletion: toInt(h.pointsPerCompletion),
        achievementId: h.achievementId || null,
        achievementName: h.Achievement ? h.Achievement.name : null,
        achievementCreatedAtWIB: h.Achievement?.createdAt ? fmtWIB(h.Achievement.createdAt) : null,
        frequency: effFreq,
        status: already ? "done" : "pending",
        canComplete,
        lastCompletedAt: already?.completedAt || null,
        lastCompletedAtWIB: already ? fmtWIB(already.completedAt) : null,
        periodEndWIB,
      };

      (effFreq === "Weekly" ? weekly : daily).push(item);
    }

    const sortFn = (a, b) =>
      (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1);
    daily.sort(sortFn);
    weekly.sort(sortFn);

    return res.json({
      daily,
      weekly,
      meta: {
        daily: { startWIB: dailyWin.startWIB, endWIB: dailyWin.endWIB },
        weekly: { startWIB: weeklyWin.startWIB, endWIB: weeklyWin.endWIB },
      },
    });
  } catch (err) {
    console.error("GET /habits/grouped error:", err);
    res.status(500).json({ error: "Gagal mengambil habits (grouped)", detail: String(err?.message || err) });
  }
}

/* =========================
   POST /habits/:id/complete  (STRICT WINDOW GUARD)
========================= */
async function completeHabit(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!req.user?.id) { await t.rollback(); return res.status(401).json({ error: "Unauthorized" }); }
    const habitId = Number(req.params.id);
    if (!Number.isFinite(habitId) || habitId <= 0) { await t.rollback(); return res.status(400).json({ error: "Habit ID tidak valid" }); }

    // 1) Lock habit (aktif)
    const habit = await Habit.findOne({
      where: { id: habitId, userId: req.user.id, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!habit) { await t.rollback(); return res.status(404).json({ error: "Habit tidak ditemukan" }); }

    // 2) Ambil achievement parent (kalau ada)
    let achievement = null;
    if (habit.achievementId) {
      achievement = await Achievement.findByPk(habit.achievementId, {
        attributes: ["id", "name", "frequency", "targetPoints", "status", "validFrom", "validTo"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // Pastikan window terisi (fallback sekali)
      if (achievement && (!achievement.validFrom || !achievement.validTo)) {
        const { periodStart, periodEnd } = getCurrentWindowWIB(achievement.frequency || "Daily");
        achievement.validFrom = periodStart;
        achievement.validTo = periodEnd;
        achievement.status = "ACTIVE";
        await achievement.save({ transaction: t });
      }
    }

    // 3) Dapatkan window efektif untuk anti-cheat
    const effFreq = getEffectiveFrequency(habit, achievement);
    const { periodStart, periodEnd } = getCurrentWindowWIB(effFreq);

    // Jika achievement ada STRICT GUARD berdasarkan window kartu
    if (achievement) {
      const now = new Date();

      // Lazy expire/completed bila lewat window
      if (achievement.validFrom && achievement.validTo && now > achievement.validTo) {
        if ((achievement.frequency || "Daily") === "Weekly") {
          const progress = await sumContribInWindow(req.user.id, achievement.id, achievement.validFrom, achievement.validTo, t);
          const target = toInt(achievement.targetPoints);
          achievement.status = target > 0 && progress >= target ? "COMPLETED" : "EXPIRED";
        } else {
          achievement.status = "EXPIRED";
        }
        await achievement.save({ transaction: t });
      }

      // Tolak bila di luar window atau kartu tidak ACTIVE
      const inWindow = achievement.validFrom && achievement.validTo
        ? now >= achievement.validFrom && now <= achievement.validTo
        : true;
      if (achievement.status !== "ACTIVE" || !inWindow) {
        await t.rollback();
        return res.status(409).json({
          error: "Kartu tidak aktif / di luar periode.",
          status: achievement.status,
          periodWIB: { from: fmtWIB(achievement.validFrom), to: fmtWIB(achievement.validTo) },
        });
      }
    }

    // 4) Anti-cheat: hanya 1x per window (pakai window efektif)
    const done = await HabitCompletion.findOne({
      where: {
        userId: req.user.id,
        habitId: habit.id,
        completedAt: { [Op.gte]: achievement?.validFrom || periodStart, [Op.lt]: achievement?.validTo || periodEnd },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (done) { await t.rollback(); return res.status(409).json({ error: "Sudah diselesaikan pada periode ini" }); }

    const delta = toInt(habit.pointsPerCompletion);
    if (delta <= 0) { await t.rollback(); return res.status(400).json({ error: "Poin habit tidak valid" }); }

    // 5) Tambah poin ledger
    const { balanceAfter } = await addPointsAtomic({
      userId: req.user.id,
      delta,
      reason: "completed_habit",
      refType: "Habit",
      refId: habit.id,
      transaction: t,
    });

    // 6) Catat completion
    const hc = await HabitCompletion.create(
      { userId: req.user.id, habitId: habit.id, pointsAwarded: delta, completedAt: new Date() },
      { transaction: t }
    );

    // 7) Progress achievement (opsional, hanya untuk respon FE)
    let achievementProgress = null;
    if (achievement) {
      const contrib = await sumContribInWindow(
        req.user.id,
        achievement.id,
        achievement.validFrom || periodStart,
        achievement.validTo || periodEnd,
        t
      );
      const target = toInt(achievement.targetPoints);
      achievementProgress = {
        achievementId: achievement.id,
        achievementName: achievement.name,
        contributedThisPeriod: contrib,
        targetPoints: target,
        periodPercent: target > 0 ? Math.min(100, Math.floor((contrib / target) * 100)) : 0,
        claimable: target > 0 ? contrib >= target : false,
      };
    }

    await t.commit();
    return res.json({
      message: "Habit selesai",
      addedPoints: delta,
      newBalance: balanceAfter,
      completedAt: hc.completedAt,
      completedAtWIB: fmtWIB(hc.completedAt),
      achievementProgress,
    });
  } catch (err) {
    console.error("POST /habits/:id/complete error:", err);
    await t.rollback();
    res.status(500).json({ error: "Gagal menyelesaikan habit", detail: String(err?.message || err) });
  }
}

/* =========================
   PUT /habits/:id
========================= */
async function updateHabit(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Habit ID tidak valid" });

    const h = await Habit.findOne({ where: { id, userId: req.user.id, isActive: true } });
    if (!h) return res.status(404).json({ error: "Habit tidak ditemukan" });

    const { title, pointsPerCompletion, achievementId } = req.body;

    if (title !== undefined) h.title = title;
    if (pointsPerCompletion !== undefined) h.pointsPerCompletion = toInt(pointsPerCompletion);
    if (achievementId !== undefined) h.achievementId = achievementId || null;

    await h.save();
    res.json({ message: "Habit diperbarui", habit: h });
  } catch (err) {
    console.error("PUT /habits/:id error:", err);
    res.status(500).json({ error: "Gagal memperbarui habit", detail: String(err?.message || err) });
  }
}

/* =========================
   DELETE /habits/:id  (soft delete -> isActive=false)
========================= */
async function deleteHabit(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Habit ID tidak valid" });

    const [affected] = await Habit.update(
      { isActive: false, updatedAt: new Date() },
      { where: { id, userId: req.user.id, isActive: true } }
    );

    if (affected === 0) {
      const exists = await Habit.findOne({ where: { id, userId: req.user.id } });
      if (!exists) return res.status(404).json({ error: "Habit tidak ditemukan" });
      return res.json({ message: "Habit sudah nonaktif", deleted: false });
    }

    return res.json({ message: "Habit dihapus (soft delete)", deleted: true });
  } catch (err) {
    console.error("DELETE /habits/:id error:", err);
    res.status(500).json({ error: "Gagal menghapus habit", detail: String(err?.message || err) });
  }
}

module.exports = {
  listHabits,
  listHabitsGrouped,
  completeHabit,
  updateHabit,
  deleteHabit,
};
