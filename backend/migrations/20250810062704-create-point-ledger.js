'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PointLedgers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      delta: { type: Sequelize.INTEGER, allowNull: false }, // + / -
      reason: { type: Sequelize.ENUM('completion', 'claim', 'reversal'), allowNull: false },
      refType: { type: Sequelize.STRING, allowNull: true }, // 'HabitCompletion' | 'Reward' | ...
      refId: { type: Sequelize.INTEGER, allowNull: true },
      balanceAfter: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('PointLedgers', ['userId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PointLedgers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PointLedgers_reason";');
  }
};
