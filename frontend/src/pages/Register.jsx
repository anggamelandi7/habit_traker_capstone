// src/pages/Register.jsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';


const HERO = '/images/register-page.jpg';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    document.title = 'Daftar • HabitApp';
  }, []);

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
    setErrMsg('');
  };

  const mismatch = useMemo(
    () => form.password && form.confirm && form.password !== form.confirm,
    [form.password, form.confirm]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setOkMsg('');

    // validasi ringan
    if (mismatch) {
      setErrMsg('Konfirmasi password tidak sama.');
      return;
    }
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setErrMsg('Semua field wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      const res = await axios.post('http://localhost:5000/auth/register', payload);

      setOkMsg('Registrasi berhasil! Silakan login.');
      // opsional: simpan user singkat kalau backend mengembalikan
      if (res.data?.user) localStorage.setItem('user_temp', JSON.stringify(res.data.user));

      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Gagal registrasi. Coba lagi.';
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.2fr_1fr] bg-gray-50">
      {/* Panel Gambar (kiri) */}
      <div className="relative hidden lg:block overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 mix-blend-multiply bg-gradient-to-b from-indigo-900/55 via-indigo-800/35 to-purple-900/55" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(800px 500px at 35% 55%, rgba(0,0,0,.18), transparent 60%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <div className="text-2xl font-semibold">HabitApp</div>
          <p className="mt-1 text-sm text-white/90">
            Mulai perjalanan kebiasaanmu, raih pencapaian, dan kumpulkan rewards.
          </p>
        </div>
      </div>

      {/* Panel Form (kanan) */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:border-l lg:border-gray-100">
        <div className="w-full max-w-md">
          {/* Brand kecil (mobile) */}
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold">
              H
            </div>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">HabitApp</div>
              <div className="text-xs text-gray-500 leading-none">Track your habits</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Buat akun baru</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gratis dan cepat. Hanya butuh beberapa detik.
          </p>

          {/* Alert error / success */}
          {errMsg && (
            <div
              id="register-error"
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errMsg}
            </div>
          )}
          {okMsg && (
            <div
              id="register-ok"
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {okMsg}
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
                  aria-describedby={errMsg ? 'register-error' : undefined}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-9 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-gray-400">
                  @
                </span>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="nama_pengguna"
                value={form.username}
                onChange={handleChange}
                aria-invalid={Boolean(errMsg)}
                aria-describedby={errMsg ? 'register-error' : undefined}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
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
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(errMsg)}
                  aria-describedby={errMsg ? 'register-error' : undefined}
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      className="h-5 w-5" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10 10a4 4 0 0 0 5.66 5.66" />
                      <path d="M2 12s4-7 10-7 10 7 10 7a17.5 17.5 0 0 1-3.1 3.25" />
                      <path d="M9.5 5.5A11 11 0 0 1 12 5c6 0 10 7 10 7" />
                    </svg>
                  ) : (
                    // eye
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      className="h-5 w-5" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimal 6 karakter disarankan.</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Ulangi password"
                  value={form.confirm}
                  onChange={handleChange}
                  aria-invalid={mismatch || Boolean(errMsg)}
                  aria-describedby={(mismatch || errMsg) ? 'register-error' : undefined}
                  className={`w-full rounded-lg border bg-white px-4 py-2.5 pr-10 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2
                    ${mismatch
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-1.5 grid place-items-center px-2 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirm ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                >
                  {showConfirm ? (
                    // eye-off
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      className="h-5 w-5" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10 10a4 4 0 0 0 5.66 5.66" />
                      <path d="M2 12s4-7 10-7 10 7 10 7a17.5 17.5 0 0 1-3.1 3.25" />
                      <path d="M9.5 5.5A11 11 0 0 1 12 5c6 0 10 7 10 7" />
                    </svg>
                  ) : (
                    // eye
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      className="h-5 w-5" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {mismatch && (
                <p className="mt-1 text-xs text-red-600">Konfirmasi password tidak sama.</p>
              )}
            </div>

            {/* Submit */}
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
                  <span className="opacity-0">Daftar</span>
                </>
              ) : (
                'Daftar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            <span>atau</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* CTA: sudah punya akun */}
          <p className="mt-4 text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
