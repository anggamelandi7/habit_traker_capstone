'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Habits', 'rewardName', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('Habits', 'rewardDesc', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('Habits', 'rewardPoints', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

    await queryInterface.addColumn('Habits', 'targetCount', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('Habits', 'progressCount', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

    await queryInterface.addColumn('Habits', 'reminderEnabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('Habits', 'reminderTime', { type: Sequelize.STRING, allowNull: true });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('Habits', 'rewardName');
    await queryInterface.removeColumn('Habits', 'rewardDesc');
    await queryInterface.removeColumn('Habits', 'rewardPoints');
    await queryInterface.removeColumn('Habits', 'targetCount');
    await queryInterface.removeColumn('Habits', 'progressCount');
    await queryInterface.removeColumn('Habits', 'reminderEnabled');
    await queryInterface.removeColumn('Habits', 'reminderTime');
  }
};
