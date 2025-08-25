# AI Session 3 — Copy-UX
**Model**: IBM Granite 3.3 8B Instruct (via Replicate)  
**Run ID**: f8qc0amf15rmc0crvk39qp272m

**Goal**: microcopy Dashboard (new vs existing user)


## Prompt (exact)
Act as a product copywriter. Write Indonesian microcopy for a habit-tracking dashboard.

Audience:
- New users and existing users.

Constraints:
- Tone: friendly, encouraging, concise.
- Each variant ≤ 2 sentences.
- Include placeholders: {username} (string), {pendingCount} (integer).
- Also propose a short CTA button label (≤ 3 words), Indonesian.

Tasks:
1) For NEW user (no habits yet): provide 3 variants (title + 1 short line + CTA label).
2) For EXISTING user (has pending habits): provide 3 variants (title + 1 short line mentioning {pendingCount} + CTA label).
Return as JSON with this shape:
{
  "newUser": [{ "title": "...", "line": "...", "cta": "..." }, ...],
  "existingUser": [{ "title": "...", "line": "... {pendingCount} ...", "cta": "..." }, ...]
}
Keep it clean and ready to paste.
-----

````json
{
  "newUser": [
    {
      "title": "Mulai Menciptakan Kabit Terbaik",
      "line": "Belum memiliki kabit? Tinggal menginap saja!",
      "cta": "Buat Kabit"
    },
    {
      "title": "Rutinitas Anda, Sekarang!",
      "line": "Mulai menciptakan rutinitas yang baik dengan kabit pertama Anda.",
      "cta": "Buat Kabit"
    },
    {
      "title": "Kabit Anda, Tangguh Anda",
      "line": "Langkah pertama untuk menjadi orang lebih baik, mulailah sekarang.",
      "cta": "Buat Kabit"
    }
  ],
  "existingUser": [
    {
      "title": "Tetap Konsisten dengan Kabit Anda",
      "line": "Anda telah memiliki {pendingCount} kabit yang belum selesai. Tetap konsisten!",
      "cta": "Mulai Mengikuti Kabit"
    },
    {
      "title": "Jangan Ragu, Coba Kabit Anda",
      "line": "Anda memiliki {pendingCount} kabit menunggu di sini. Coba sekarang!",
      "cta": "Mulai Mengikuti Kabit"
    },
    {
      "title": "Kabit Anda, Kemenangan Anda",
      "line": "Tetap terus menerus dengan {pendingCount} kabit Anda. Kemenangan Anda hanya satu langkah lagi!",
      "cta": "Mulai Mengikuti Kabit"
    }
  ]
}
````
**Perbaikan**
````json
{
  "newUser": [
    {
      "title": "Halo, {username}! Mulai kebiasaanmu",
      "line": "Belum punya kebiasaan? Buat satu target sederhana untuk hari ini.",
      "cta": "Buat Habit"
    },
    {
      "title": "Selamat datang, {username}",
      "line": "Bangun rutinitas kecil—mulai dari satu kebiasaan dulu.",
      "cta": "Tambah Habit"
    },
    {
      "title": "Siap lebih konsisten?",
      "line": "Atur tujuanmu dan biarkan HabitApp mengingatkanmu.",
      "cta": "Mulai"
    }
  ],
  "existingUser": [
    {
      "title": "Lanjutkan, {username}!",
      "line": "Ada {pendingCount} habit yang menunggu hari ini.",
      "cta": "Kerjakan"
    },
    {
      "title": "Hampir sampai!",
      "line": "Tuntaskan {pendingCount} habit untuk kunci reward.",
      "cta": "Lanjutkan"
    },
    {
      "title": "Konsisten itu kunci",
      "line": "{pendingCount} habit belum selesai—ayo selesaikan satu per satu.",
      "cta": "Buka Habits"
    }
  ]
}
````
**Cara pakai cepat di Dashboard**
````js
src/utils/dashboardCopy.js
import copy from '../copy/dashboard.id.json'; // simpan JSON di src/copy/dashboard.id.json

export function pickDashboardCopy(username, pendingCount) {
  const isNew = !pendingCount || pendingCount <= 0;
  const variants = isNew ? copy.newUser : copy.existingUser;
  const msg = variants[Math.floor(Math.random() * variants.length)];
  return {
    title: msg.title.replace('{username}', username || 'Kamu'),
    line: msg.line.replace('{pendingCount}', String(pendingCount ?? 0)),
    cta: msg.cta
  };
}
````
````js
// di Dashboard.jsx
import { pickDashboardCopy } from '../utils/dashboardCopy';

const { title, line, cta } = pickDashboardCopy(user?.username, pendingCount);

<h1 className="text-2xl font-bold">{title}</h1>
<p className="text-gray-600 mt-1">{line}</p>
<button className="btn-primary mt-4" onClick={() => navigate('/habits')}>
  {cta}
</button>
````
----
**Note**
- Screenshot run (Replicate): `docs/ai-usage/screenshots/session-3.png`
- Model: `ibm-granite/granite-3.3-8b-instruct`
- Note: AI support digunakan saat pengembangan saja, tidak dibundel ke runtime app.