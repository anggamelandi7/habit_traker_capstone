module.exports = {
  async up(queryInterface, Sequelize) {
    // helper: describe table dengan fallback schema 'public'
    const describe = async (name) => {
      try { return await queryInterface.describeTable(name); }
      catch (e1) {
        try { return await queryInterface.describeTable(name, { schema: 'public' }); }
        catch (e2) { return null; }
      }
    };

    // 1) Deteksi tabel yang ada (plural/singular)
    let info = await describe('userRewards');
    let existingName = 'userRewards';

    if (!info) {
      const singular = await describe('userReward');
      if (singular) {
        // rename ke plural biar konsisten
        await queryInterface.renameTable('userReward', 'userRewards').catch(() => {});
        info = await describe('userRewards');
        existingName = 'userRewards';
      }
    }

    // 2) Jika belum ada sama sekali → buat tabel baru komplit
    if (!info) {
      await queryInterface.createTable('userRewards', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
        },
        rewardId: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Rewards', key: 'id' }, onDelete: 'CASCADE'
        },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'CLAIMED' },
        claimedAt: { type: Sequelize.DATE, allowNull: true },

        // kolom tambahan ledger
        pointsSpent: { type: Sequelize.INTEGER, allowNull: true },
        balanceBefore: { type: Sequelize.INTEGER, allowNull: true },
        balanceAfter: { type: Sequelize.INTEGER, allowNull: true },
        achievementId: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'Achievements', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
        },
        idempotencyKey: { type: Sequelize.STRING, allowNull: true, unique: true },
        metadata: { type: Sequelize.JSON, allowNull: true },

        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      // unique & index
      await queryInterface.addConstraint('userRewards', {
        fields: ['userId', 'rewardId'],
        type: 'unique',
        name: 'uniq_user_reward_once',
      });
      await queryInterface.addIndex('userRewards', ['userId']);
      await queryInterface.addIndex('userRewards', ['rewardId']);
      await queryInterface.addIndex('userRewards', ['status']);
      return;
    }

    // 3) Tabelnya ada → tambahkan kolom yang belum ada
    const addIfMissing = async (col, spec) => {
      if (!info[col]) {
        await queryInterface.addColumn('userRewards', col, spec);
        // update cache info setelah add
        info[col] = spec;
      }
    };

    await addIfMissing('pointsSpent', { type: Sequelize.INTEGER, allowNull: true });
    await addIfMissing('balanceBefore', { type: Sequelize.INTEGER, allowNull: true });
    await addIfMissing('balanceAfter', { type: Sequelize.INTEGER, allowNull: true });
    await addIfMissing('achievementId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'Achievements', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
    });
    await addIfMissing('idempotencyKey', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('metadata', { type: Sequelize.JSON, allowNull: true });

    // unique untuk idempotencyKey (best-effort)
    await queryInterface.addConstraint('userRewards', {
      fields: ['idempotencyKey'],
      type: 'unique',
      name: 'uniq_userRewards_idempotencyKey',
    }).catch(() => {});

    // composite unique satu kali klaim per user/reward
    await queryInterface.addConstraint('userRewards', {
      fields: ['userId', 'rewardId'],
      type: 'unique',
      name: 'uniq_user_reward_once',
    }).catch(() => {});

    // index
    await queryInterface.addIndex('userRewards', ['userId']).catch(() => {});
    await queryInterface.addIndex('userRewards', ['rewardId']).catch(() => {});
    await queryInterface.addIndex('userRewards', ['status']).catch(() => {});
  },

  async down(queryInterface) {
    // balikkan perubahan yang kita tambahkan saja
    await queryInterface.removeConstraint('userRewards', 'uniq_userRewards_idempotencyKey').catch(() => {});
    await queryInterface.removeConstraint('userRewards', 'uniq_user_reward_once').catch(() => {});
    await queryInterface.removeIndex('userRewards', ['userId']).catch(() => {});
    await queryInterface.removeIndex('userRewards', ['rewardId']).catch(() => {});
    await queryInterface.removeIndex('userRewards', ['status']).catch(() => {});
    for (const col of ['pointsSpent', 'balanceBefore', 'balanceAfter', 'achievementId', 'idempotencyKey', 'metadata']) {
      await queryInterface.removeColumn('userRewards', col).catch(() => {});
    }
  }
};