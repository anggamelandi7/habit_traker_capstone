'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HabitCompletions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      habitId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Habits', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      completedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      pointsAwarded: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('HabitCompletions', ['userId', 'habitId']);
    await queryInterface.addIndex('HabitCompletions', ['completedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('HabitCompletions');
  }
};
