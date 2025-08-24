# AI Session 2 — ProtectedRoute (React Router v6)

**Model**: IBM Granite 3.3 8B Instruct (via Replicate)  
**Run ID**: 5jj7yp9jdsrme0crvjtv5zxn74

**Goal**: Menulis komponen ProtectedRoute yang mendukung pola children *dan* `<Outlet />`, kompatibel React Router v6.22+.

---

## Prompt (exact)
You are a senior React 18 engineer. Write a production-ready ProtectedRoute for React Router v6.

Requirements:
- JavaScript (no TypeScript).
- Auth token is stored in localStorage under key "token".
- If no token: redirect to "/login" (replace history).
- Support BOTH patterns:
  A) <ProtectedRoute><MainLayout /></ProtectedRoute>
  B) <Route element={<ProtectedRoute />}> … <Outlet/> …
- Must work with React Router v6.22+.
- Keep it small, readable, and dependency-free.

Deliverables:
1) The ProtectedRoute component (single file) that supports both children and <Outlet/>.
2) A minimal usage snippet for App.jsx route config.
3) Brief explanation of how it avoids double Router issues and common pitfalls.
Return only code blocks + short notes.

---

## Model output (excerpt)
Model memberikan komponen ProtectedRoute dan cuplikan penggunaan. Namun ada beberapa hal yang perlu dikoreksi:
- Menggunakan `Route render` (API **v5**), bukan v6.
- Import `useNavigate` dari `react-router` (harusnya `react-router-dom`).
- Menempatkan `<Router>` di `App.jsx` (berpotensi **double Router** jika `main.jsx` juga sudah membungkusnya).

---

## Final implementation (fixed for v6.22+)

**src/components/ProtectedRoute.jsx**
```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // simpan lokasi saat ini agar bisa redirect balik setelah login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // dukung dua pola: children (A) atau Outlet (B)
  return children ? children : <Outlet />;
}
````
**src/main.jsx (Router hanya SEKALI di entry)**
````jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
````
**src/App.jsx — Pattern A (layout sebagai children)**
````jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
// ... import halaman lain

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<Login />} />

      {/* protected */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* route protected lain */}
      </Route>

      {/* default & fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
````
**Alternatif — Pattern B (Outlet)**
````jsx
<Route element={<ProtectedRoute />}>
  <Route element={<MainLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    {/* dst */}
  </Route>
</Route>
````
----
**Why this avoids double-router issues**

- `<BrowserRouter>` hanya dideklarasikan sekali di `main.jsx.`
- `App.jsx` cukup memakai `<Routes>/<Route>;` tidak membungkus `<Router>` lagi.
- `ProtectedRoute` tidak membuat router baru; hanya mengembalikan `children` atau `<Outlet />.`

**Verification checklist**

1. Pastikan tidak ada `<BrowserRouter>` lain selain di `main.jsx.`
2. Tanpa token (`localStorage.removeItem('token')`), akses /dashboard → redirect ke `/login.`
3. Setelah login (token terset), akses `/dashboard` → halaman tampil normal.
4. Navigasi nested route tetap render via `<Outlet />` pada layout.
----
**Notes**
- Model membantu arah solusi, namun kodenya masih API v5; diadaptasi ke v6 agar kompatibel dan mencegah double-router.
- Screenshot run (Replicate): `docs/ai-usage/screenshots/session-2.png`