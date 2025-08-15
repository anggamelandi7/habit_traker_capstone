const { Reward, UserReward } = require('../models');
const { addPointsAtomic } = require('../services/pointsService');

async function claimReward(req, res) {
  try {
    const userId = req.user.id;
    const rewardId = +req.params.id;

    const reward = await Reward.findOne({ where: { id: rewardId, isActive: true, userId } });
    if (!reward) return res.status(404).json({ error: 'Reward tidak ditemukan atau non-aktif' });

    const { balanceAfter, ledger } = await addPointsAtomic({
      userId, delta: -reward.costPoints, reason: 'claim', refType: 'Reward', refId: rewardId
    });

    let claim = null;
    if (UserReward) {
      claim = await UserReward.create({ userId, rewardId, status: 'claimed', claimedAt: new Date() });
    }

    res.json({ message: `Berhasil klaim reward: ${reward.name}`, balanceAfter, ledgerId: ledger.id, claimId: claim?.id || null });
  } catch (err) {
    console.error('claimReward error:', err);
    res.status(400).json({ error: err.message || 'Gagal klaim reward' });
  }
}

module.exports = { claimReward };
