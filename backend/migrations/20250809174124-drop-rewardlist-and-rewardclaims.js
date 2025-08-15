'use strict';

/**
 * Migration aman untuk menghapus tabel yang sudah tidak dipakai:
 * - rewardlist
 * - rewardclaims
 *
 * Menangani beberapa variasi nama tabel (plural/camel/snake).
 */

async function dropIfExists(queryInterface, tableName) {
  try {
    // describeTable akan throw kalau tabel tidak ada -> kita tangkap dan skip
    await queryInterface.describeTable(tableName);
    await queryInterface.dropTable(tableName);
    console.log(`[DROP] Tabel ${tableName} dihapus.`);
  } catch (err) {
    console.log(`[SKIP] Tabel ${tableName} tidak ditemukan, skip.`);
  }
}

module.exports = {
  async up (queryInterface /*, Sequelize */) {
    // Coba beberapa kemungkinan nama table rewardlist
    const rewardListCandidates = [
      'Rewardlists', 'RewardLists', 'rewardlists', 'reward_list', 'rewardlist'
    ];

    // Coba beberapa kemungkinan nama table rewardclaims
    const rewardClaimsCandidates = [
      'RewardClaims', 'rewardclaims', 'reward_claims'
    ];

    for (const t of rewardListCandidates) {
      await dropIfExists(queryInterface, t);
    }
    for (const t of rewardClaimsCandidates) {
      await dropIfExists(queryInterface, t);
    }
  },

  async down (queryInterface, Sequelize) {
    // Kalau di-rollback, kita buat ulang tabel minimal (struktur sederhana saja)
    // NOTE: Sesuaikan kalau kamu punya definisi lama yang spesifik.
    // Rewardlists (minimal)
    try {
      await queryInterface.createTable('Rewardlists', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
      console.log('[CREATE] Tabel Rewardlists dibuat kembali (minimal).');
    } catch (e) {
      console.log('[SKIP] Gagal/skip membuat Rewardlists saat down:', e.message);
    }

    // RewardClaims (minimal)
    try {
      await queryInterface.createTable('RewardClaims', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        rewardName: { type: Sequelize.STRING, allowNull: false },
        points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
      console.log('[CREATE] Tabel RewardClaims dibuat kembali (minimal).');
    } catch (e) {
      console.log('[SKIP] Gagal/skip membuat RewardClaims saat down:', e.message);
    }
  }
};
