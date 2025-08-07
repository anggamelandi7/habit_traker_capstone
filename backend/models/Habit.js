module.exports = (sequelize, DataTypes) => {
  const Habit = sequelize.define('Habit', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
     userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
  });
Habit.associate = (models) => {
    Habit.belongsTo(models.User, {
      foreignKey: "userId",
      onDelete: "CASCADE",
   });
  };   
  return Habit;
};
