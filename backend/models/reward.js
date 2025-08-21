// models/reward.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const Reward = sequelize.define(
    "Reward",
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      requiredPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      expiryDate: { type: DataTypes.DATE, allowNull: true },

      
      status: {
        type: DataTypes.STRING, 
        allowNull: true,        
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      
      achievementId: { type: DataTypes.INTEGER, allowNull: true },
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
