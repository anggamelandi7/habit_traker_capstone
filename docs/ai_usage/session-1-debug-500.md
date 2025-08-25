# AI Session 1 — Debug 500 on Express Route

**Model**: IBM Granite 3.3 8B Instruct (via Replicate)  
**Run ID**: yd4x9wft5nrmc0crvjar9xkzvr  
**Scope**: Backend — `achievementRoutes.js` / `achievementController.js`  
**Goal**: Fix `TypeError: argument handler must be a function` and stabilize `/achievements` endpoints.

---

## Prompt (exact)

You are a senior Node.js + Express engineer. Analyze this error and propose a safe, minimal patch.

Context:
- Framework: Express + Router
- Error message: "TypeError: argument handler must be a function"
- Stack: at achievementRoutes.js:34,8 → Router.post(...)
- We previously saw 500s on GET /achievements as well.

Code excerpt (pseudo if you need to assume):
router.post('/create', /* something here is not a function */);

Tasks:
1) List the top 5 root causes for this exact Express error.
2) Identify what to check in achievementRoutes.js (wrong import/export, missing function, calling controller instead of function reference, async wrapper issues, etc.).
3) Provide a DIFF-style patch (unified diff) that shows the correct import/export and a valid function handler signature for POST /achievements (e.g., createAchievement).
4) Add a short checklist to verify the fix (npm start, curl example, expected 2xx JSON).
Keep the answer concise and production-safe.

---

## Key takeaways from the model

- Penyebab umum: (1) salah import/export controller, (2) fungsi tidak didefinisikan/typo, (3) yang dipassing ke `router.*` bukan function, (4) wrapper async tidak benar, (5) mereferensikan fungsi tanpa require/import yang benar.
- Fokus perbaikan: pastikan **named export**/CommonJS export konsisten, dan `router.post()` menerima **reference ke fungsi**, bukan hasil eksekusi atau objek.

---

## Patch (minimal & safe)

> Gunakan salah satu gaya module di seluruh backend (contoh berikut CommonJS).

**controllers/achievementController.js**
```diff
- // pastikan controller diekspor dengan benar
- module.exports = {
-   listAchievements,
-   // createAchievement tidak diekspor? → error
- };

+ // contoh ekspor lengkap
+ async function createAchievement(req, res, next) {
+   try {
+     // ... validasi & create logic ...
+     return res.status(201).json({ ok: true, id: /* new id */ });
+   } catch (err) { next(err); }
+ }
+
+ async function listAchievements(req, res, next) {
+   try {
+     // ... fetch logic ...
+     return res.json({ items: [] });
+   } catch (err) { next(err); }
+ }
+
+ module.exports = {
+   createAchievement,
+   listAchievements,
+   // ... export controller lain di sini
+ };
````
- **controllers/achievementController.js**
```diff
- const express = require('express');
- const router = express.Router();
- const achievementController = require('../controllers/achievementController');
- // kadang yang dipass bukan function → error
- router.post('/create', achievementController); 

+ const express = require('express');
+ const router = express.Router();
+ const { createAchievement, listAchievements } =
+   require('../controllers/achievementController');
+
+ // GET list
+ router.get('/', listAchievements);
+
+ // POST create — penting: pass function reference, bukan object/exec result
+ router.post('/', createAchievement);
+
+ module.exports = router;
````
**Verification checklist**

1. Build & run
````bash
npm run dev
````
Server log bebas dari “argument handler must be a function”.

2. Smoke test GET
````bash
curl -i http://localhost:5001/achievements -H "Authorization: Bearer <TOKEN>"
````
Expected: 200 OK + JSON list.

3. Create test POST
````bash
curl -i -X POST http://localhost:5001/achievements \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Daily Focus","frequency":"Daily","targetPoints":10,"description":"..." }'
````
Expected: 201 Created + { ok: true, id: ... }.


4. Front-end: halaman Achievements memuat tanpa 500; tombol “Buat Pencapaian” berhasil membuat item baru.
---
**Evidence**

- Screenshot run (Replicate): `docs/ai-usage/screenshots/session-1.png`
<p align="center">
  <img src="docs/ai-usage/screenshots/session-1.png" alt="Trackify Logo" width="200"/>
</p>

- Model: `ibm-granite/granite-3.3-8b-instruct`
- Note: AI support digunakan saat pengembangan saja, tidak dibundel ke runtime app.