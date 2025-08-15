
module.exports = (sequelize, DataTypes) => {
  const HabitCompletion = sequelize.define('HabitCompletion', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    habitId: { type: DataTypes.INTEGER, allowNull: false },
    completedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    pointsAwarded: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, {
    updatedAt: false
  });
  HabitCompletion.associate = (models) => {
    HabitCompletion.belongsTo(models.User, { foreignKey: 'userId' });
    HabitCompletion.belongsTo(models.Habit, { foreignKey: 'habitId' });
  };
  return HabitCompletion;
};
