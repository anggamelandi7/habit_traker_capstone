// src/pages/Login.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

/**
 * Aset (taruh di /public/images):
 * - /images/Logo.png         ← logo kamu yang sudah ada teks "HabitApp — Track Your Habits"
 * - /images/login-hero.png   ← ilustrasi halaman login
 */
const LOGO = '/images/Logo.png';
const HERO = '/images/login-page.png';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    document.title = 'Masuk • HabitApp';
  }, []);

  const handleChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/auth/login', form);
      if (res.data?.token) localStorage.setItem('token', res.data.token);
      if (res.data?.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Gagal login. Periksa email & password.';
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* ===== Panel Ilustrasi (kiri, desktop) ===== */}
      <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
        {/* Aksen lembut */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 560px at 30% 55%, rgba(99,102,241,.10), transparent 60%)',
          }}
          aria-hidden="true"
        />
        {/* Ilustrasi proporsional & tidak terpotong */}
        <img
          src={HERO}
          alt="Ilustrasi kebiasaan personal"
          className="z-10 max-w-[620px] xl:max-w-[720px] w-full h-auto object-contain p-10"
          draggable="false"
        />
        {/* Footer caption kecil */}
        <div className="absolute left-10 right-10 bottom-8 z-10 text-gray-700">
          <div className="text-base font-semibold">Bangun kebiasaan, raih pencapaian.</div>
          <p className="mt-1 text-sm text-gray-600">Kumpulkan poin dan tukarkan jadi reward favoritmu.</p>
        </div>
        {/* Pembatas profesional (hairline + inner shadow) di sisi kanan */}
        <div className="absolute right-0 top-0 h-full w-px bg-gray-200 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.02)]" />
      </div>

      {/* ===== Panel Form (kanan) ===== */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Logo BESAR & jelas (center) */}
          <div className="mb-6 flex items-center justify-center">
            <img
              src={LOGO}
              alt="HabitApp — Track Your Habits"
              className="h-20 md:h-24 w-auto object-contain drop-shadow-md"
              draggable="false"
            />
          </div>

          {/* Kartu form (rapi & fokus) */}
          <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-100 p-6 sm:p-7">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Masuk ke akun</h1>
            <p className="mt-1 text-sm text-gray-600">
              Selamat datang kembali! Silakan masuk untuk melanjutkan.
            </p>

            {errMsg && (
              <div
                id="login-error"
                role="alert"
                aria-live="polite"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errMsg)}
                    aria-describedby={errMsg ? 'login-error' : undefined}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-9 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-gray-400">
                    @
                  </span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errMsg)}
                    aria-describedby={errMsg ? 'login-error' : undefined}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-1.5 grid place-items-center px-2 text-gray-500 hover:text-gray-700"
                    aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    title={showPwd ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPwd ? (
                      // eye-off
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l18 18M10 10a4 4 0 005.66 5.66" />
                        <path d="M2 12s4-7 10-7 10 7 10 7a17.5 17.5 0 01-3.1 3.25" />
                      </svg>
                    ) : (
                      // eye
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Opsi kecil */}
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Ingat saya
                </label>
              </div>

              {/* Tombol submit */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="relative w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 font-medium text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="absolute left-1/2 -translate-x-1/2">
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    </span>
                    <span className="opacity-0">Masuk</span>
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
              <div className="h-px flex-1 bg-gray-200" />
              <span>atau</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* CTA daftar */}
            <p className="mt-4 text-sm text-gray-600">
              Belum punya akun?{' '}
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
