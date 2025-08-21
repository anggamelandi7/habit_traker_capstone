'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, Sequelize) {
    // status = ACTIVE | COMPLETED | EXPIRED
    await q.addColumn('Achievements', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'COMPLETED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    });

    // window waktu presisi UTC (nanti dihitung berdasarkan WIB)
    await q.addColumn('Achievements', 'validFrom', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    });
    await q.addColumn('Achievements', 'validTo', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    });

    // optional: index untuk query cepat kartu aktif per user & jenis
    await q.addIndex('Achievements', ['userId', 'frequency', 'status'], {
      name: 'ix_achievements_user_freq_status',
    });

    // NOTE: kolom lama 'expiryDate' tetap dibiarkan (tidak dipakai lagi).
    // NOTE: kolom 'isActive' nantinya bisa dianggap turunan dari 'status'.
  },

  async down(q, Sequelize) {
    await q.removeIndex('Achievements', 'ix_achievements_user_freq_status').catch(()=>{});
    await q.removeColumn('Achievements', 'validTo');
    await q.removeColumn('Achievements', 'validFrom');
    await q.removeColumn('Achievements', 'status');

    // Hapus tipe ENUM di beberapa DB perlu manual (Postgres):
    if (q.sequelize.getDialect() === 'postgres') {
      await q.sequelize.query(`DROP TYPE IF EXISTS "enum_Achievements_status";`);
    }
  }
};
