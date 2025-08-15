module.exports = (sequelize, DataTypes) => {
  const Habit = sequelize.define('Habit', {
    title: { type: DataTypes.STRING, allowNull: false },
    frequency: { type: DataTypes.ENUM('Daily','Weekly'), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    pointsPerCompletion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    targetValue: { type: DataTypes.INTEGER, allowNull: true },
    progressValue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reminderEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    reminderTime: { type: DataTypes.TIME, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {});
  Habit.associate = (models) => {
    Habit.belongsTo(models.User, { foreignKey: 'userId' });
    Habit.hasMany(models.HabitCompletion, { foreignKey: 'habitId' });
    Habit.belongsTo(models.Achievement, { foreignKey: "achievementId" });
  };
  return Habit;
};