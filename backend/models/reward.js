"use strict";

module.exports = (sequelize, DataTypes) => {
  const Reward = sequelize.define(
    "Reward",
    {
      userId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING, allowNull: false },
      requiredPoints: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.TEXT },
      expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {}
  );
  Reward.associate = (models) => {
    Reward.hasMany(models.RewardClaim, { foreignKey: "rewardId" });
    // optional: Reward.hasMany(models.UserReward, { foreignKey: 'rewardId' });
  };
  return Reward;
};
