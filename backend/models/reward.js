// backend/models/reward.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const Reward = sequelize.define(
    "Reward",
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      requiredPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      description: { type: DataTypes.TEXT, allowNull: true },
      expiryDate: { type: DataTypes.DATE, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      // relasi ke Achievement (opsional, untuk pairing)
      achievementId: { type: DataTypes.INTEGER, allowNull: true },

      // kalau kamu memang punya kolom ini di DB, biarkan:
      // isClaimed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // claimedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "Rewards",
    }
  );

  Reward.associate = (models) => {
    Reward.belongsTo(models.User, { foreignKey: "userId" });
    Reward.belongsTo(models.Achievement, { foreignKey: "achievementId" });
  };

  return Reward;
};
