// backend/migrations/20250822-drop-UserRewards-duplicate.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    const describe = async (name) => {
      try { return await queryInterface.describeTable(name); }
      catch { return null; }
    };

    // Ada tabel "UserRewards"?
    const exists = await describe('UserRewards');
    if (!exists) return;

    // Hitung baris (dialect-aware quoting sederhana)
    const qName = dialect === 'postgres' ? '"UserRewards"' : 'UserRewards';
    let count = 0;
    try {
      const [rows] = await queryInterface.sequelize.query(`SELECT COUNT(*) AS c FROM ${qName}`);
      const r = rows?.[0] || {};
      count = Number(r.c ?? r.count ?? r.COUNT ?? 0);
    } catch { /* kalau gagal, anggap tidak nol supaya tidak drop sembarangan */ count = -1; }

    if (count === 0) {
      // aman: drop
      await queryInterface.dropTable('UserRewards').catch(() => {});
    } else {
      // ada isi → jangan dihapus; rename sebagai backup agar tidak dipakai lagi
      await queryInterface.renameTable('UserRewards', 'UserRewards_backup').catch(() => {});
    }
  },

  async down(queryInterface, Sequelize) {
    // optional: kembalikan backup menjadi UserRewards kalau ada
    try {
      await queryInterface.renameTable('UserRewards_backup', 'UserRewards');
    } catch {}
  },
};
