"use strict";
module.exports = (sequelize, DataTypes) => {
  const AchievementClaim = sequelize.define("AchievementClaim", {
    // foreign keys (pastikan kolom ini memang ada di tabel)
    userId:        { type: DataTypes.INTEGER, allowNull: false },
    achievementId: { type: DataTypes.INTEGER, allowNull: false },

    // periode klaim (WIB window yang sudah kamu hitung di controller)
    periodStart:   { type: DataTypes.DATE, allowNull: false },
    periodEnd:     { type: DataTypes.DATE, allowNull: false },

    // waktu klaim
    claimedAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: "AchievementClaims",
    underscored: false,
  });

  AchievementClaim.associate = (models) => {
    AchievementClaim.belongsTo(models.User,         { foreignKey: "userId" });
    AchievementClaim.belongsTo(models.Achievement,  { foreignKey: "achievementId" });
  };

  return AchievementClaim;
};
