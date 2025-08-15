const { Reward, User } = require('../models');

async function listRewards(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, { attributes: ['pointBalance'] });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const rewards = await Reward.findAll({
      where: { userId, isActive: true },
      order: [['costPoints', 'ASC']],
    });

    const data = rewards.map(r => ({
      id: r.id,
      name: r.name,
      costPoints: r.costPoints,
      isActive: r.isActive,
      expiryDate: r.expiryDate,
      claimable: user.pointBalance >= r.costPoints,
    }));

    res.json(data);
  } catch (err) {
    console.error('listRewards error:', err);
    res.status(500).json({ error: 'Gagal mengambil rewards' });
  }
}

module.exports = { listRewards };
