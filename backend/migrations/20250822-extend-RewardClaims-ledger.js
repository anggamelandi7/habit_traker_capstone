// backend/migrations/20250822-extend-RewardClaims-ledger.js
'use strict';
module.exports = {
  async up(q, Sequelize) {
    const describe = async (name) => {
      try { return await q.describeTable(name); } catch { return null; }
    };
    // coba beberapa ejaan yang umum
    const names = ['RewardClaims', 'rewardClaims', 'rewardclaims'];
    let tbl = null, name = null;
    for (const n of names) { const d = await describe(n); if (d) { tbl = d; name = n; break; } }
    if (!tbl) return; // tidak ada tabelnya—lewati

    const addIf = async (col, spec) => { if (!tbl[col]) { await q.addColumn(name, col, spec); tbl[col] = spec; } };

    await addIf('pointsSpent',   { type: Sequelize.INTEGER, allowNull: true });
    await addIf('balanceBefore', { type: Sequelize.INTEGER, allowNull: true });
    await addIf('balanceAfter',  { type: Sequelize.INTEGER, allowNull: true });
    await addIf('idempotencyKey',{ type: Sequelize.STRING,  allowNull: true });
    await addIf('metadata',      { type: Sequelize.JSON ?? Sequelize.TEXT, allowNull: true });

    // unique (userId, rewardId) → cegah klaim ganda
    await q.addConstraint(name, { fields: ['userId','rewardId'], type: 'unique', name: `uniq_${name}_user_reward` }).catch(()=>{});
    // unique idempotency (opsional)
    await q.addConstraint(name, { fields: ['idempotencyKey'], type: 'unique', name: `uniq_${name}_idempotency` }).catch(()=>{});
    // index bantu
    await q.addIndex(name, ['userId']).catch(()=>{});
    await q.addIndex(name, ['rewardId']).catch(()=>{});
    await q.addIndex(name, ['status']).catch(()=>{});
  },
  async down(q) {
    // noop / atau hapus kolom & constraint kalau perlu
  }
};
