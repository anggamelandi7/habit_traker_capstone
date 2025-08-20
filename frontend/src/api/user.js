// src/api/user.js
import { apiGet } from './client';

/**
 * Sumber: GET /rewards/total
 * Mengembalikan: { id, username, email, badge, pointBalance, totalPoints_legacy, balance }
 */
export function getMeAndBalance() {
  return apiGet('/rewards/total');
}
