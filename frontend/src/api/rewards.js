import { apiGet, apiPost } from './client';

export const listRewards = () => apiGet('/rewards');
export const createReward = (payload) => apiPost('/rewards', payload);
export const claimReward = (id) => apiPost(`/rewards/${id}/claim`);
export const getTotalPoints = () => apiGet('/rewards/total');      // alternatif saldo
export const getLedgerSummary = () => apiGet('/points/ledger');     // ada summary.totalBalance & rewardProgress
