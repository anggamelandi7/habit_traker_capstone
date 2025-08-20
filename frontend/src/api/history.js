// src/api/history.js
import { apiGet } from './client';

export function getLedger({ page = 1, limit = 20, startDate, endDate, type }) {
  const q = new URLSearchParams();
  q.set('page', page);
  q.set('limit', limit);
  if (startDate) q.set('startDate', startDate);
  if (endDate) q.set('endDate', endDate);
  if (type) q.set('type', type);
  return apiGet(`/history/ledger?${q.toString()}`);
}

export function getHabitCompletions({ page = 1, limit = 20, startDate, endDate, habitId, frequency }) {
  const q = new URLSearchParams();
  q.set('page', page);
  q.set('limit', limit);
  if (startDate) q.set('startDate', startDate);
  if (endDate) q.set('endDate', endDate);
  if (habitId) q.set('habitId', habitId);
  if (frequency) q.set('frequency', frequency);
  return apiGet(`/history/habits?${q.toString()}`);
}

export function getRewardClaims({ page = 1, limit = 20, startDate, endDate }) {
  const q = new URLSearchParams();
  q.set('page', page);
  q.set('limit', limit);
  if (startDate) q.set('startDate', startDate);
  if (endDate) q.set('endDate', endDate);
  return apiGet(`/history/rewards/claims?${q.toString()}`);
}
