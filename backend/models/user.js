"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    badge: { type: DataTypes.STRING, allowNull: true },
    pointBalance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  });

  User.associate = (models) => {
    User.hasMany(models.Habit, { foreignKey: "userId", as: "habits" });
    User.hasMany(models.HabitCompletion, {
      foreignKey: "userId",
      as: "habitCompletions",
    });
    User.hasMany(models.PointLedger, {
      foreignKey: "userId",
      as: "pointLedgers",
    });
    User.hasMany(models.Reward, { foreignKey: "userId", as: "rewards" });
    User.hasMany(models.UserReward, {
      foreignKey: "userId",
      as: "userRewards",
    });
  };

  return User;
};
