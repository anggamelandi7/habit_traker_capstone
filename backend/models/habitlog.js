module.exports = (sequelize, DataTypes) => {
  const HabitLog = sequelize.define('HabitLog', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    habitId: { type: DataTypes.INTEGER, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    loggedAt: { type: DataTypes.DATE, allowNull: false }
  });
  HabitLog.associate = (models) => {
    HabitLog.belongsTo(models.User, { foreignKey: 'userId' });
    HabitLog.belongsTo(models.Habit, { foreignKey: 'habitId' });
  };
  return HabitLog;
};