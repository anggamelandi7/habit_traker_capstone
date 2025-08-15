'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserRewards', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      rewardId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Rewards', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      status: { 
        type: Sequelize.ENUM('claimable', 'claimed'), 
        allowNull: false, 
        defaultValue: 'claimed' 
      },
      claimedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('UserRewards', ['userId', 'rewardId', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserRewards');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_UserRewards_status";');
  }
};
