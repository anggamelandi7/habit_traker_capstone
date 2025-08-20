/**
 * Hitung frequency efektif habit
 * - Kalau habit terikat ke Achievement → ikut frequency Achievement
 * - Kalau standalone → pakai habit.frequency
 */
function getEffectiveFrequency(habit, achievement) {
  if (habit.achievementId && achievement) {
    return achievement.frequency; // inherit dari achievement
  }
  return habit.frequency || "Daily"; // default fallback
}

module.exports = { getEffectiveFrequency };