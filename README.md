# HabitApp — Personal Habit Tracker (Capstone Hactiv8)

> **Full-Functioning Web App**: habit tracking dengan **Achievements (Daily/Weekly)**, **Habits**, **Rewards**, **Stats**, dan **Profile** — dibangun dengan React + Express + Sequelize. Dirancang dengan disiplin ketat (Daily reset 00:00 WIB; Weekly berlaku 7 hari).

## Demo & Repos
- **Repository**: _(https://github.com/anggamelandi7/habit_traker_capstone.git)_


---

## Overview
**HabitApp** membantu kamu membangun kebiasaan konsisten lewat dua tipe pencapaian:
- **Daily** — berlaku **hari ini** (WIB) dari 00:00 sampai 23:59:59.
- **Weekly** — berlaku **7 hari** penuh sejak kartu dibuat.

Tambahkan **Habits** ke **Achievement card**, selesaikan untuk kumpulkan poin, lalu **klaim Rewards** saat target tercapai. **Stats** menampilkan KPI & grafik, **Profile** untuk kelola akun.

### Strict Discipline (WIB)
- **Daily**: otomatis **EXPIRED** tepat **00:00 WIB** hari berikutnya → non-interaktif.
- **Weekly**: valid **7 hari** sejak dibuat. Akhir periode: **COMPLETED** jika target tercapai; jika belum, **EXPIRED**.
- **Riwayat** tidak dihapus; status disimpan untuk histori & statistik.

---

## Fitur Utama
- **Auth** (Login/Register), **protected routes**, JWT Bearer (di `localStorage`).
- **Achievements**
  - Buat **Daily** / **Weekly**, tambah **deskripsi**, tetapkan **target points**.
  - Tambah **Habits** dengan ikon otomatis (berdasar nama), warna UI konsisten.
  - **Lock & Stamp**: jika sudah diklaim → kartu terkunci dengan cap _“Sudah di claim”_ (hanya bisa dihapus).
  - Toggle **“Sembunyikan yang sudah di-claim”** (persist di `localStorage`).
- **Habits**
  - Seksi “**Habits hari ini**” & “**Habits minggu ini**”.
  - **Kalender**: badge ‘done’ per hari; **Weekly** ditandai **sepanjang window 7 hari**; Daily pending di tanggal terpilih.
  - Konfirmasi selesai & modal edit; hanya interaktif **dalam window**.
- **Rewards**
  - **Pairing otomatis** Achievement ↔ Reward; muncul saat progress ≥ target.
  - Klaim dengan **animasi confetti**, guard agar reward tidak respawn setelah diklaim.
  - **Saldo poin** & **Riwayat klaim** (sumber resmi: tabel `userRewards`).
- **Stats**
  - KPI: **Total Habits**, **Total Completion**, **Total Claims**, **Saldo Poin**.
  - Grafik **Completion Harian** (bar, WIB, 7/30/90 hari), **Tren Saldo** (line), **Distribusi Habit** Daily vs Weekly.
- **Profile**
  - Sapaan username, ringkasan kontribusi.
  - Kelola profil: **ganti username** & **ganti password**.
- **UI/UX**
  - **Hero section + ilustrasi** di halaman, **empty-state** ramah, tema konsisten (**blueviolet** di Stats).

---

## Tech Stack
- **Frontend**: React (Vite/CRA), React Router, TailwindCSS, Recharts.
- **Backend**: Node.js, Express.js, Sequelize ORM.
- **Database**: MySQL/PostgreSQL/SQLite (via Sequelize).
- **Auth**: JWT (Bearer) + middleware `verifyToken`.
- **Deployment**: Netlify/Vercel (FE), host bebas untuk BE.

---

## Arsitektur Singkat
```text
frontend/
  src/
    pages/            # Login, Register, Dashboard, Habits, Achievements,   Rewards, Stats, Profile
    components/       # Calendar, Header/Topbar, Sidebar, dll
    utils/api.js      # axios instance -> baseURL + Authorization
    api/              # (opsional) wrapper per modul (rewards, dsb)
  public/assets/      # ilustrasi & logo

backend/
  controllers/        # achievementController, habitController, rewardController, userController
  routes/             # achievementRoutes, habitRoutes, rewardRoutes, userRoutes
  models/             # User, Achievement, Habit, HabitCompletion, Reward, userRewards, ...
  middlewares/        # authMiddleware (verifyToken)
  config/config.json  # Sequelize configs (dev/test/prod)
  server.js           # bootstrap Express

````

Relasi penting:
- `Achievement (Daily/Weekly)` **1-to-many** `Habit`
- `Habit` **1-to-many** `HabitCompletion`
- `Achievement` **paired** ke `Reward` (1-to-1 via `achievementId`)
- `userRewards` = **riwayat klaim resmi** (sumber Total Claims & history FE)

---

##  Getting Started

### 1) Prasyarat
- Node.js v18+
- (Opsional) `npm i -g sequelize-cli`
- Database aktif (MySQL/Postgres/SQLite)

### 2) Setup Backend
```bash
cd backend
cp config/config.example.json config/config.json   # sesuaikan kredensial DB
# Buat DB sesuai config, lalu:
npx sequelize db:migrate
# (opsional) npx sequelize db:seed:all

npm install
npm run dev   # atau: npm start
# default: http://localhost:5000
````

 ENV :
```bash 
JWT_SECRET=your-secret
NODE_ENV=development
PORT=5000
```
> Endpoint penting: /achievements, /habits, /rewards, /rewards/history, /users/me, /users/update-username, /users/update-password, /points/ledger (opsional; fallback /ledger/range atau /ledger).


### 3) Setup Frontend
````bash
cd frontend
npm install
# sesuaikan baseURL di src/utils/api.js (default: http://localhost:5000)
npm run dev    # development
npm run build  # production
````
Letakkan ilustrasi di public/images/ : 
````bash
Logo.png
login-page.png
register-page.png
dashboard-page.png
habits.png
achievements.png
rewards.png
stats.png

````
---

### Autentikasi
- JWT disimpan di `localStorage (token).`
- `src/utils/api.js` menambahkan header `Authorization: Bearer <token>.`

---

### API Reference (ringkas) 
> Nama & skema dapat sedikit bervariasi sesuai migrasi terbaru.

#### Achievements
- `GET /achievements` → daftar card + window (WIB), status, progress, habits.
- `POST /achievements` → buat card (name, frequency: Daily|Weekly, targetPoints, description?).
Alias: POST /achievements/daily, POST /achievements/weekly.
- PUT /achievements/:id → update `name, targetPoints, description` (+sinkron `requiredPoints` reward).
- `DELETE /achievements/:id` → soft delete card (nonaktifkan reward pasangan).
- `POST /achievements/:id/habits` → tambah habit.

#### Habits
- `GET /habits/grouped` → `{ daily: [...], weekly: [...], meta: {...} }`
- `POST /habits/:id/complete` → tambah HabitCompletion & update saldo.
- `PUT /habits/:id`, `DELETE /habits/:id.`

#### Rewards
- `GET /rewards` → `{ balance, items: [...] }`
- `POST /rewards/:id/claim` → klaim, update saldo & rekam di `userRewards.`
- `GET /rewards/history?limit=` → riwayat klaim (sumber Total Claims).

#### Users
- `GET /users/me`
- `PUT /users/update-username` → `{ username }`
- `PUT /users/update-password` → `{ oldPassword, newPassword }`
---

### Perhitungan & Rules

- Daily window = 00:00–23:59:59 WIB (strict). Di luar window → EXPIRED & non-interaktif.
- Weekly window = 7×24 jam sejak dibuat. Akhir periode: COMPLETED jika contrib ≥ target; jika tidak, EXPIRED.
- Pairing Reward otomatis saat membuat Achievement.
- History & Stats:
    - Total Claims = jumlah item ``GET /rewards/history` (bukan dari delta ledger).
    - Completion Harian = jumlah transaksi +delta terdeteksi sebagai habit completion.
    - Saldo dari `/rewards` `(balance)` fallback ke `/rewards/total.`
---
### Troubleshooting 
- 500 /achievements: cek export function di controller & routes (handler harus function).
- 404 /habit-completions: FE sudah pakai endpoint baru (`/habits/grouped`, `/habits/:id/complete).`
- Reward respawn setelah klaim: pastikan `/rewards` tidak mengembalikan item claimed; FE punya guard lokal.
- Duplikasi tabel (`UserRewards` vs `userRewards`): gunakan `userRewards` sebagai tabel riwayat resmi; drop duplikat.
---
### AI Support (Development-only)
- Proyek ini menggunakan IBM Granite 3.3 8B Instruct (via Replicate) hanya pada tahap pengembangan untuk:
- Debugging & refactor: menganalisis error 500/404 (Express) dan merapikan arsitektur Router (React Router v6).
- UI/UX microcopy: menyusun pesan sambutan Dashboard (new vs existing user) dalam Bahasa Indonesia.
- Spesifikasi perilaku: membantu memformalkan strict WIB (kadaluarsa harian 00:00 WIB; weekly 7 hari).
> AI tidak dibundel ke aplikasi runtime/produksi. Semua keputusan akhir melalui review dan pengujian.
---
### Roadmap (opsional)
- Template auto-generate Daily/Weekly.
- Notifikasi in-app menjelang expired.
- Dark mode & theming.
- Internationalization (i18n).
---
### Lisensi
MIT — silakan gunakan, modifikasi, dan kembangkan.
---
### 🙌 Kredit
Capstone Project — Hactiv8. Terima kasih untuk mentor & rekan.