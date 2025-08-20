// models/achievement.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const Achievement = sequelize.define("Achievement", {
    name: { type: DataTypes.STRING, allowNull: false },
    targetPoints: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    description: DataTypes.TEXT,
    expiryDate: DataTypes.DATEONLY,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    frequency: {                            
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Daily",                
    }
  }, {
    tableName: "Achievements",
  });

  Achievement.associate = (models) => {
    Achievement.belongsTo(models.User, { foreignKey: "userId" });
    Achievement.hasMany(models.Habit, { foreignKey: "achievementId" });
    Achievement.hasMany(models.AchievementClaim, { foreignKey: "achievementId" });
  };

  return Achievement;
};
