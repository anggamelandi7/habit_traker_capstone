const { sequelize, User, PointLedger } = require('../models');

async function addPointsAtomic({ userId, delta, reason, refType, refId, transaction = null }) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('delta harus integer non-zero');
  }

  const useExternalTx = !!transaction;
  const t = useExternalTx ? transaction : await sequelize.transaction();

  try {
    // Lock baris user untuk konsistensi saldo
    const user = await User.findOne({
      where: { id: userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!user) throw new Error('User tidak ditemukan');

    const newBalance = user.pointBalance + delta;
    if (newBalance < 0) {
      throw new Error('Saldo poin tidak cukup');
    }

    // update saldo user
    user.pointBalance = newBalance;
    await user.save({ transaction: t });

    // simpan ledger
    const ledger = await PointLedger.create({
      userId,
      delta,
      reason,
      refType,
      refId,
      balanceAfter: newBalance
    }, { transaction: t });

    if (!useExternalTx) await t.commit();
    return { ledger, balanceAfter: newBalance };
  } catch (err) {
    if (!useExternalTx) await t.rollback();
    throw err;
  }
}

module.exports = { addPointsAtomic };
