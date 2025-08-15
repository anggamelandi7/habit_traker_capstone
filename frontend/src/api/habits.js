import { apiGet, apiPost, apiPut, apiDel } from './client';

export const getHabits = () => apiGet('/habits');
export const createHabit = (payload) => apiPost('/habits', payload);
export const completeHabit = (id) => apiPost(`/habits/${id}/complete`);
export const updateHabit = (id, patch) => apiPut(`/habits/${id}`, patch);
export const deleteHabit = (id) => apiDel(`/habits/${id}`);
