'use strict';
module.exports = {
  async up(q, Sequelize) {
    await q.addColumn('Rewards', 'status', {
      type: Sequelize.ENUM('AVAILABLE','CLAIMED','EXPIRED'),
      allowNull: false,
      defaultValue: 'AVAILABLE',
    });
    await q.addColumn('Rewards', 'claimedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    // Hindari duplikasi reward untuk achievement yang sama
    await q.addIndex('Rewards', ['userId','achievementId'], {
      name: 'ux_rewards_user_achievement',
      unique: true,
      where: { achievementId: { [Sequelize.Op.ne]: null } }
    });
  },
  async down(q, Sequelize) {
    await q.removeIndex('Rewards','ux_rewards_user_achievement').catch(()=>{});
    await q.removeColumn('Rewards','claimedAt');
    await q.removeColumn('Rewards','status');
    if (q.sequelize.getDialect()==='postgres') {
      await q.sequelize.query('DROP TYPE IF EXISTS "enum_Rewards_status";');
    }
  }
};