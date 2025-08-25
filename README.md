<p align="center">
  <img src="frontend/public/images/logo.png" alt="Trackify Logo" width="100"/>
</p>

# 🌟HabitApp — Habit Tracker & Self-Reward System

![License](https://img.shields.io/badge/license-MIT-blue.svg)  
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20Express%20%7C%20PostgreSQL-6aa6f8)  
![Status](https://img.shields.io/badge/status-active-success.svg)

> **HabitApp** adalah aplikasi Habit Tracker modern berbasis web yang membantu pengguna membangun kebiasaan baik secara konsisten 🎯.  
> Setiap habit yang diselesaikan akan memberi poin, yang bisa ditukar dengan **Reward** sesuai target user.  
> Project ini adalah bagian dari **Capstone Hacktiv8**.

---

## ✨ Features

- 🔐 **Authentication**
  - Register & Login dengan JWT
  - Proteksi route via middleware

- ✅ **Habit Management**
  - Tambah, edit, hapus Habit
  - Daily / Weekly habit
  - Progress tracking + streak harian/mingguan

- 🏆 **Rewards System**
  - Klaim reward dengan poin
  - Status reward: aktif, kadaluarsa, history klaim
  - Saldo poin realtime

- 📊 **Dashboard**
  - Ringkasan habit aktif & reward
  - Info saldo poin
  - Quick actions (add habit, add achievement, lihat rewards)

- 📅 **Calendar View**
  - Integrasi kalender (daily/weekly)
  - Event habit selesai vs pending

- 📈 **Stats**
  - Grafik progres habit mingguan
  - Analitik jumlah habit berdasarkan frekuensi

- 🎉 **Gamification**
  - Animasi confetti saat klaim reward
  - Badge untuk user berdasarkan poin

---

## 🛠️ Tech Stack

**Frontend**  
- ⚛️ React  
- 🎨 Tailwind CSS  
- 📦 Axios  

**Backend**  
- 🟩 Node.js + Express  
- 🗄️ PostgreSQL (via Sequelize ORM)  
- 🔑 JWT Authentication  

**Dev Tools**  
- Sequelize CLI (migrations & seeders) 
- Postman
- Dbeaver  

---


## 📂 Project Structure

```bash
Angga_Melandi-FinalProject/
├── backend/
│   ├── controllers/
│   ├── models/          # Sequelize models
│   ├── migrations/      # Sequelize migrations
│   ├── seeders/         # Optional demo data
│   ├── routes/
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── api/         # API client
    │   ├── components/  # Reusable UI
    │   ├── pages/       # Dashboard, Habits, Rewards, Stats
    │   └── main.jsx
    └── index.css
````

Relasi penting:
- `Achievement (Daily/Weekly)` **1-to-many** `Habit`
- `Habit` **1-to-many** `HabitCompletion`
- `Achievement` **paired** ke `Reward` (1-to-1 via `achievementId`)
- `userRewards` = **riwayat klaim resmi** (sumber Total Claims & history FE)

---

## 🚀Getting Started

````bash
cd backend
npm install
````
Buat file .env (copy dari .env.example):
````bash
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=trackify_dev
DB_PORT=5432
JWT_SECRET=yoursecret
````
Lalu jalankan migration:
````bash
npx sequelize-cli db:migrate
````
Jalankan server:
````bash
npm run dev
````
Server jalan di http://localhost:5000.

**2. Setup Backend**
````bash
cd ../frontend
npm install
npm run start
````

Letakkan ilustrasi di public/images/ : 
````
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

## 🧪 API Endpoints (ringkas) ## 
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
----
## 📖 Development Guide

- Gunakan sequelize-cli untuk migrasi schema:
````bash
npx sequelize-cli migration:generate --name add-something
npx sequelize-cli db:migrate
````
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
---
👥 Author

🧑 Angga Melandi — Fullstack Web Developer
---
