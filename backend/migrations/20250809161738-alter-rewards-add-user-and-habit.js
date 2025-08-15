'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Rewards');

    // userId SUDAH ada dari migration 20250802181237, jadi skip
    // Tambah habitId kalau belum ada
    if (!table.habitId) {
      await queryInterface.addColumn('Rewards', 'habitId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Habits', key: 'id' },
        onDelete: 'SET NULL'
      });
    }
  },

  async down (queryInterface) {
    const table = await queryInterface.describeTable('Rewards');
    if (table.habitId) {
      await queryInterface.removeColumn('Rewards', 'habitId');
    }
  }
};
