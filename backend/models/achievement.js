// models/achievement.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const Achievement = sequelize.define(
    "Achievement",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      targetPoints: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
      description: DataTypes.TEXT,

      // legacy (boleh dibiarkan untuk kompatibilitas)
      expiryDate: DataTypes.DATEONLY,

      // NEW: disiplin ketat berbasis waktu
      status: {
        type: DataTypes.ENUM("ACTIVE", "COMPLETED", "EXPIRED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      validFrom: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, // UTC
      validTo: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },   // UTC

      // legacy: tidak lagi jadi sumber kebenaran; status jadi acuan
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

      // pakai string (Daily/Weekly) agar aman dengan data lama
      frequency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Daily",
        validate: { isIn: [["Daily", "Weekly"]] },
      },
    },
    {
      tableName: "Achievements",
    }
  );

  Achievement.associate = (models) => {
    Achievement.belongsTo(models.User, { foreignKey: "userId" });
    Achievement.hasMany(models.Habit, { foreignKey: "achievementId" });
    Achievement.hasMany(models.AchievementClaim, { foreignKey: "achievementId" });
  };

  return Achievement;
};
