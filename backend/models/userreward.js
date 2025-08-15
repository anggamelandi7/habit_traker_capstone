"use strict";

module.exports = (sequelize, DataTypes) => {
  const UserReward = sequelize.define("UserReward", {
    userId:   { type: DataTypes.INTEGER, allowNull: false },
    rewardId: { type: DataTypes.INTEGER, allowNull: false },
    status:   { type: DataTypes.ENUM("claimable", "claimed"), allowNull: false, defaultValue: "claimed" },
    claimedAt:{ type: DataTypes.DATE, allowNull: true },
  });

  UserReward.associate = (models) => {
    UserReward.belongsTo(models.User,   { foreignKey: "userId", as: "user" });
    UserReward.belongsTo(models.Reward, { foreignKey: "rewardId", as: "reward" });
  };

  return UserReward;
};
