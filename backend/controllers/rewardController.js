const { RewardList, RewardClaim, User } = require('../models');

// Ambil semua reward yang tersedia dari RewardList
const getAllRewards = async (req, res) => {
  try {
    const rewards = await RewardList.findAll();
    res.json(rewards);
  } catch (err) {
    console.error('GET /rewards error:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar reward' });
  }
};

// Klaim reward tertentu dari daftar
const claimReward = async (req, res) => {
  try {
    const reward = await RewardList.findByPk(req.params.id);
    if (!reward) return res.status(404).json({ error: 'Reward tidak ditemukan' });

    const user = await User.findByPk(req.user.id);
    if (user.totalPoints < reward.points) {
      return res.status(400).json({ error: 'Point tidak cukup untuk klaim reward ini' });
    }

    // Kurangi point user
    user.totalPoints -= reward.points;
    await user.save();

    // Simpan ke tabel klaim
    await RewardClaim.create({
      userId: user.id,
      rewardName: reward.name,
      points: reward.points
    });

    res.json({ message: 'Reward berhasil diklaim!' });
  } catch (err) {
    console.error('POST /rewards/claim error:', err);
    res.status(500).json({ error: 'Gagal klaim reward' });
  }
};

// Ambil riwayat klaim reward
const getRewardHistory = async (req, res) => {
  try {
    const history = await RewardClaim.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(history);
  } catch (err) {
    console.error('GET /rewards/history error:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat reward' });
  }
};

module.exports = {
  getAllRewards,
  claimReward,
  getRewardHistory
};
