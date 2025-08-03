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

  });
Habit.associate = (models) => {
    Habit.belongsTo(models.User, {
      foreignKey: "userId",
      onDelete: "CASCADE",
   });
  };   
  return Habit;
};
