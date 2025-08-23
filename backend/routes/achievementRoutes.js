// backend/routes/achievementRoutes.js
const express = require('express');
const router = express.Router();

// Auth middleware bisa diexport sebagai default atau bernama.
// Blok ini memastikan kita selalu dapat function.
let verifyToken = require('../middlewares/authMiddleware');
if (verifyToken && typeof verifyToken !== 'function' && verifyToken.verifyToken) {
  verifyToken = verifyToken.verifyToken;
}

// Controller
const ctrl = require('../controllers/achievementController');

// Helper kecil untuk memastikan handler valid function (hindari "argument handler must be a function")
function ensureFn(fn, name = 'handler') {
  if (typeof fn !== 'function') {
    throw new TypeError(`${name} must be a function, got ${typeof fn}`);
  }
  return fn;
}

// Proteksi semua route dengan auth (kalau mau sebagian publik, pindahkan baris ini)
router.use(ensureFn(verifyToken, 'verifyToken'));

// ==== Routes ====
// List achievements (support ?includeInactive=1 & ?claimable=1)
router.get('/', ensureFn(ctrl.listAchievements, 'listAchievements'));

// Card aktif: /achievements/active?type=daily|weekly
router.get('/active', ensureFn(ctrl.getActive, 'getActive'));

// Buat achievement (compat generic)
router.post('/', ensureFn(ctrl.createAchievement, 'createAchievement'));

// Buat daily (window WIB hari ini)
router.post('/daily', ensureFn(ctrl.createDaily, 'createDaily'));

// Buat weekly (7 hari sejak dibuat)
router.post('/weekly', ensureFn(ctrl.createWeekly, 'createWeekly'));

// Update achievement
router.put('/:id', ensureFn(ctrl.updateAchievement, 'updateAchievement'));

// Soft delete achievement
router.delete('/:id', ensureFn(ctrl.deleteAchievement, 'deleteAchievement'));

// Tambah habit ke achievement tertentu
router.post('/:id/habits', ensureFn(ctrl.addHabitToAchievement, 'addHabitToAchievement'));

// (Opsional) finalize manual sebuah achievement: COMPLETED/EXPIRED (untuk testing)
router.post('/:id/finalize', async (req, res) => {
  try {
    const result = await ctrl.finalizeAchievement(req.params.id, {});
    res.json({ ok: true, claim: result });
  } catch (e) {
    console.error('manual finalize error:', e);
    res.status(500).json({ error: 'Gagal memfinalisasi achievement' });
  }
});

// Detail achievement
router.get('/:id', ensureFn(ctrl.getAchievementDetail, 'getAchievementDetail'));

module.exports = router;
