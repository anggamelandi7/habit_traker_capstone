module.exports = (sequelize, DataTypes) => {
  const PointLedger = sequelize.define('PointLedger', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    habitId: { type: DataTypes.INTEGER, allowNull: true },
    rewardId: { type: DataTypes.INTEGER, allowNull: true },
    delta: { type: DataTypes.INTEGER, allowNull: false }, // +/-
    reason: { type: DataTypes.TEXT, allowNull: false },
    balanceAfter: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    updatedAt: false
  });
  PointLedger.associate = (models) => {
    PointLedger.belongsTo(models.User, { foreignKey: 'userId' });
    PointLedger.belongsTo(models.Habit, { foreignKey: 'habitId' });
    PointLedger.belongsTo(models.Reward, { foreignKey: 'rewardId' });
  };
  return PointLedger;
};