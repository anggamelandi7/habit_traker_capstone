// controllers/pointsController.js
const { Op } = require("sequelize");
const { PointLedger, Habit, Reward, User } = require("../models");

function fmtWIB(d) {
  if (!d) return null;
  const optsDate = { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric" };
  const optsTime = { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: true };
  const datePart = new Intl.DateTimeFormat("en-GB", optsDate).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", optsTime).format(d).replace(":", ".");
  return `${datePart} • ${timePart}`;
}

exports.getUserLedgerDetailed = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

    const page  = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate)   where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    const { rows, count } = await PointLedger.findAndCountAll({
      where,
      include: [
        { model: Habit,  attributes: ["id", "title"], required: false },
        { model: Reward, attributes: ["id", "name"],  required: false },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // ==== bentuk data siap tampil ====
    const items = rows.map(r => {
      const title = r.Habit ? r.Habit.title : null;
      const rname = r.Reward ? r.Reward.name : null;

      let kind = "Adjustment";
      if (title) kind = `Completed: ${title}`;
      if (rname) kind = `Claim: ${rname}`;

      return {
        id: r.id,
        atUTC: r.createdAt,
        atWIB: fmtWIB(r.createdAt),
        kind,
        reason: r.reason,
        delta: Number(r.delta),
        balanceAfter: Number(r.balanceAfter),
        habit:  title ? { id: r.Habit.id,  title } : null,
        reward: rname ? { id: r.Reward.id, name:  rname } : null,
      };
    });

    // ==== saldo terkini ====
    const user = await User.findByPk(req.user.id, { attributes: ["pointBalance"] });
    const totalBalance = Number(user?.pointBalance ?? 0);

    // ==== progress reward ====
    const now = new Date();
    const rewards = await Reward.findAll({
      where: {
        userId: req.user.id,
        isActive: true,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
      },
      order: [["requiredPoints", "ASC"]],
    });

    const claimableRewards = rewards.filter(r => totalBalance >= Number(r.requiredPoints || 0));
    const nextTarget = rewards.find(r => totalBalance < Number(r.requiredPoints || 0)) || null;

    const nearestProgress = nextTarget
      ? Math.min(100, Math.round((totalBalance / Number(nextTarget.requiredPoints)) * 100))
      : 100;

    const bestClaimable = claimableRewards.length
      ? claimableRewards.reduce((min, r) => (Number(r.requiredPoints) < Number(min.requiredPoints) ? r : min))
      : null;

    const rewardProgress = {
      totalBalance,
      nextTarget: nextTarget ? {
        id: nextTarget.id,
        name: nextTarget.name,
        requiredPoints: Number(nextTarget.requiredPoints),
        progressPercent: nearestProgress,
        remainingPoints: Math.max(0, Number(nextTarget.requiredPoints) - totalBalance),
      } : null,
      bestClaimable: bestClaimable ? {
        id: bestClaimable.id,
        name: bestClaimable.name,
        requiredPoints: Number(bestClaimable.requiredPoints),
      } : null,
      claimableCount: claimableRewards.length,
    };

    // ==== summary ====
    const summary = {
      totalBalance,
      startingBalance: items.length
        ? items[items.length - 1].balanceAfter - items[items.length - 1].delta
        : 0,
      endingBalance: items.length ? items[0].balanceAfter : 0,
      credits: items.filter(i => i.delta > 0).reduce((a, b) => a + b.delta, 0),
      debits:  items.filter(i => i.delta < 0).reduce((a, b) => a + Math.abs(b.delta), 0),
      rewardProgress,
    };

    res.json({ page, limit, total: count, summary, items });
  } catch (err) {
    console.error("GET /points/ledger error:", err);
    res.status(500).json({ error: "Gagal mengambil ledger", detail: String(err?.message || err) });
  }
};
