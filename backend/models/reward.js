// models/reward.js

module.exports = (sequelize, DataTypes) => {
  const Reward = sequelize.define('Reward', {
    name: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Reward.associate = (models) => {
    Reward.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return Reward;
};
