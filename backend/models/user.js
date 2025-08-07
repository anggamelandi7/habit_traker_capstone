const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    badge: {
      type: DataTypes.STRING,
      allowNull: true
    },
      totalPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
   
  });
  User.associate = (models) => {
  User.hasMany(models.Habit, {
    foreignKey: "userId",
    onDelete: "CASCADE",
  });
  User.hasMany(models.Reward, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
};

  return User;
};
