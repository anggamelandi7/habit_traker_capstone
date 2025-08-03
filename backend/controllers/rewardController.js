const { Reward, User } = require('../models'); 

const getUserRewards = async (req, res) => {
  try {
    const rewards = await Reward.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });


    res.json(rewards);
  } catch (err) {
    console.error('GET /rewards error:', err);
    res.status(500).json({ error: 'Gagal mengambil data rewards' });
  }
};

const getTotalPoints = async (req, res) => {
  try {
    const { Reward } = require('../models');
    const rewards = await Reward.findAll({
      where: { userId: req.user.id }
    });

    const totalPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);

    // Tentukan badge berdasarkan total poin
    let badge = null;

if (totalPoints >= 100) {
  badge = 'Master Habit';
} else if (totalPoints >= 50) {
  badge = 'Disiplin';
} else if (totalPoints < 50) {
  badge = 'Semangat lagi';
} else {
  badge = null;
}


    // Update badge user
    await User.update(
      { badge },
      { where: { id: req.user.id } }
    );

    res.json({ 
        totalPoints,
        badge
     });
  } catch (err) {
    console.error('GET /rewards/total error:', err);
    res.status(500).json({ error: 'Gagal menghitung total poin' });
  }
};

module.exports = {
  getUserRewards,
  getTotalPoints
};
