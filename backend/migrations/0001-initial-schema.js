'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DATE, BOOLEAN } = Sequelize;

    // ===== Users =====
    await queryInterface.createTable('Users', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: STRING(100), allowNull: false, unique: true },
      email: { type: STRING(150), allowNull: false, unique: true },
      password: { type: STRING, allowNull: false },
      badge: { type: STRING(50), allowNull: true },
      pointBalance: { type: INTEGER, allowNull: false, defaultValue: 0 },
      totalPoints:  { type: INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // ===== Achievements =====
    await queryInterface.createTable('Achievements', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      UserId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      title: { type: STRING(150), allowNull: false },
      description: { type: TEXT, allowNull: true },
      targetPoints: { type: INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: STRING(20), allowNull: true }, 
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // ===== Habits =====
    await queryInterface.createTable('Habits', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      UserId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      AchievementId: {
        type: INTEGER, allowNull: true,
        references: { model: 'Achievements', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      title: { type: STRING(150), allowNull: false },
      frequency: { type: STRING(20), allowNull: false }, 
      pointsPerCompletion: { type: INTEGER, allowNull: false, defaultValue: 0 },
      startDate: { type: DATE, allowNull: true },
      endDate: { type: DATE, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // ===== HabitCompletions ===== (log check-in)
    await queryInterface.createTable('HabitCompletions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      HabitId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Habits', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      completedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('HabitCompletions', ['HabitId', 'completedAt']);

    // ===== PointLedgers ===== (mutasi poin)
    await queryInterface.createTable('PointLedgers', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      UserId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      delta: { type: INTEGER, allowNull: false }, 
      reason: { type: STRING(120), allowNull: true }, 
      refType: { type: STRING(40), allowNull: true }, 
      refId: { type: INTEGER, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('PointLedgers', ['UserId', 'createdAt']);

    // ===== Rewards ===== (daftar hadiah)
    await queryInterface.createTable('Rewards', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: STRING(150), allowNull: false },
      cost: { type: INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
      expiresAt: { type: DATE, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // ===== userRewards ===== (klaim reward oleh user)
    await queryInterface.createTable('userRewards', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      UserId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      RewardId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Rewards', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      status: { type: STRING(20), allowNull: false, defaultValue: 'claimed' }, 
      claimedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('userRewards', ['UserId', 'RewardId', 'status']);

    // ===== AchievementClaims ===== 
    await queryInterface.createTable('AchievementClaims', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      UserId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      AchievementId: {
        type: INTEGER, allowNull: false,
        references: { model: 'Achievements', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      status: { type: STRING(20), allowNull: false, defaultValue: 'completed' },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('AchievementClaims', ['UserId', 'AchievementId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AchievementClaims');
    await queryInterface.dropTable('userRewards');
    await queryInterface.dropTable('Rewards');
    await queryInterface.dropTable('PointLedgers');
    await queryInterface.dropTable('HabitCompletions');
    await queryInterface.dropTable('Habits');
    await queryInterface.dropTable('Achievements');
    await queryInterface.dropTable('Users');
  },
};
