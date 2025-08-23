'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserReward = sequelize.define('UserReward', {
    // status klaim: pakai STRING biar lintas-DB aman (CLAIMED/CANCELED/EXPIRED)
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'CLAIMED',
      validate: { isIn: [['CLAIMED', 'CANCELED', 'EXPIRED']] },
    },
    claimedAt: DataTypes.DATE,

    // kolom tambahan untuk ledger/riwayat
    pointsSpent: DataTypes.INTEGER,
    balanceBefore: DataTypes.INTEGER,
    balanceAfter: DataTypes.INTEGER,
    idempotencyKey: { type: DataTypes.STRING, unique: true },
    metadata: DataTypes.JSON,
  }, {
    tableName: 'userRewards', 
  });

  UserReward.associate = (models) => {
    UserReward.belongsTo(models.User,   { foreignKey: 'userId' });
    UserReward.belongsTo(models.Reward, { foreignKey: 'rewardId' });
    // Opsional:
    // UserReward.belongsTo(models.Achievement, { foreignKey: 'achievementId' });
  };

  return UserReward;
};
