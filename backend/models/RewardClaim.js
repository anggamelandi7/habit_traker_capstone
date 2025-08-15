module.exports = (sequelize, DataTypes) => {
  const RewardClaim = sequelize.define('RewardClaim', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    rewardId: { type: DataTypes.INTEGER, allowNull: false },
    pointsSpent: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('Claimed','Pending','Used'), defaultValue: 'Claimed' }
  }, {});
  RewardClaim.associate = (models) => {
    RewardClaim.belongsTo(models.Reward, { foreignKey: 'rewardId' });
    RewardClaim.belongsTo(models.User, { foreignKey: 'userId' });
  };
  return RewardClaim;
};