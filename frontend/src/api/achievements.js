import { apiGet, apiPost } from './client';

export const createAchievement = (payload) => apiPost('/achievements', payload);
export const listAchievements  = () => apiGet('/achievements');
export const getAchievement    = (id) => apiGet(`/achievements/${id}`);
export const addHabitToAchievement = (id, payload) => apiPost(`/achievements/${id}/habits`, payload);
export const claimAchievement  = (id) => apiPost(`/achievements/${id}/claim`);
