module.exports = (sequelize, DataTypes) => {
  const RewardList = sequelize.define('RewardList', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  return RewardList;
};