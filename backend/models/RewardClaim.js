// models/RewardClaim.js
module.exports = (sequelize, DataTypes) => {
  const RewardClaim = sequelize.define('RewardClaim', {
    userId: DataTypes.INTEGER,
    rewardName: DataTypes.STRING,
    points: DataTypes.INTEGER,
  });

  return RewardClaim;
};
