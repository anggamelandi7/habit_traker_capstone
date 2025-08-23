'use strict';

module.exports = {
  async up(q) {
    // composite unique: cegah klaim ganda
    await q.addConstraint('userRewards', {
      fields: ['userId', 'rewardId'],
      type: 'unique',
      name: 'uniq_userReward_user_reward',
    }).catch(()=>{});

    // idempotency key unique (opsional)
    await q.addConstraint('userRewards', {
      fields: ['idempotencyKey'],
      type: 'unique',
      name: 'uniq_userReward_idem',
    }).catch(()=>{});

    // index bantu
    await q.addIndex('userRewards', ['userId']).catch(()=>{});
    await q.addIndex('userRewards', ['rewardId']).catch(()=>{});
    await q.addIndex('userRewards', ['status']).catch(()=>{});
  },

  async down(q) {
    await q.removeConstraint('userRewards', 'uniq_userReward_user_reward').catch(()=>{});
    await q.removeConstraint('userRewards', 'uniq_userReward_idem').catch(()=>{});
    await q.removeIndex('userRewards', ['userId']).catch(()=>{});
    await q.removeIndex('userRewards', ['rewardId']).catch(()=>{});
    await q.removeIndex('userRewards', ['status']).catch(()=>{});
  }
};