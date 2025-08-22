// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';

/* ====== Ilustrasi (taruh file di /public/images) ====== */
const PROFILE_ILLU = '/images/profile.png';

/* ====== Helpers ====== */
const TZ = 'Asia/Jakarta';
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
function fmtDateWIB(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(iso));
}

/* Deteksi completion dari ledger kalau summary tidak ada */
function isCompletionTx(it) {
  const deltaPos = num(it?.delta) > 0;
  const rt = (it?.refType || '').toString().toLowerCase();
  const rs = (it?.reason || '').toString().toLowerCase();
  if (deltaPos && it?.habit) return true;
  if (deltaPos && (rt === 'habit' || rt === 'habitcompletion')) return true;
  if (deltaPos && /habit/.test(rs) && (/complete|completion|selesai/.test(rs) || !/bonus|reward|claim/.test(rs))) return true;
  return false;
}

/* ====== API ====== */
async function fetchMe() {
  const { data } = await API.get('/users/me'); return data || {};
}
async function fetchHabitsCount() {
  try { const { data } = await API.get('/habits'); return Array.isArray(data) ? data.length : 0; }
  catch { return 0; }
}
async function fetchCompletionTotal() {
  try {
    const { data } = await API.get('/habit-completions/summary');
    const total = data?.totalCount ?? data?.totalCompleted ?? data?.count;
    if (Number.isFinite(Number(total))) return Number(total);
  } catch {}
  try {
    const { data } = await API.get('/habit-completions', { params: { limit: 2000 } });
    if (Array.isArray(data?.items)) return data.items.length;
    if (Array.isArray(data)) return data.length;
  } catch {}
  try {
    const { data } = await API.get('/points/ledger', { params: { limit: 2000 } });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isCompletionTx).length;
  } catch {}
  try {
    const { data } = await API.get('/ledger', { params: { limit: 2000 } });
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return items.filter(isCompletionTx).length;
  } catch {}
  return 0;
}

/* Profile ops: pakai endpoint yang barusan dibuat */
async function updateUsername(newUsername) {
  const { data } = await API.patch('/users/me', { username: newUsername });
  return data;
}
async function changePassword(currentPassword, newPassword) {
  const { data } = await API.post('/users/change-password', { currentPassword, newPassword });
  return data;
}

/* ====== UI card kecil ====== */
function SummaryCard({ title, value, sub, tone = 'default' }) {
  const tones = {
    default: 'bg-white border-gray-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };
  return (
    <div className={`p-4 rounded-2xl shadow-sm border ${tones[tone] || tones.default}`}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

/* ====== Page ====== */
export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState({ username: '', email: '', badge: null, createdAt: null });

  const [habitCount, setHabitCount] = useState(0);
  const [completionTotal, setCompletionTotal] = useState(0);

  // forms
  const [uname, setUname] = useState('');
  const [savingU, setSavingU] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingP, setSavingP] = useState(false);

  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text: string }

  const isNewUser = useMemo(() => habitCount === 0 && completionTotal === 0, [habitCount, completionTotal]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');
        setLoading(true);

        const [u, hc, ct] = await Promise.all([
          fetchMe(),
          fetchHabitsCount(),
          fetchCompletionTotal(),
        ]);
        setMe(u || {});
        setHabitCount(hc || 0);
        setCompletionTotal(ct || 0);
        setUname(u?.username || '');
      } catch (e) {
        if (e?.response?.status === 401) {
          localStorage.removeItem('token');
          return navigate('/login');
        }
        setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Gagal memuat profil' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveUsername() {
    if (!uname.trim()) return setMsg({ type: 'error', text: 'Username tidak boleh kosong.' });
    setSavingU(true);
    setMsg(null);
    try {
      const res = await updateUsername(uname.trim());
      const updated = res?.user || (await fetchMe());
      setMe(updated);
      setMsg({ type: 'success', text: 'Username berhasil diperbarui.' });
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Gagal memperbarui username.' });
    } finally {
      setSavingU(false);
    }
  }

  async function handleChangePassword() {
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      return setMsg({ type: 'error', text: 'Semua kolom password wajib diisi.' });
    }
    if (pwd.next.length < 6) {
      return setMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
    }
    if (pwd.next !== pwd.confirm) {
      return setMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
    }
    setSavingP(true);
    setMsg(null);
    try {
      await changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      setMsg({ type: 'success', text: 'Password berhasil diganti.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Gagal mengganti password.' });
    } finally {
      setSavingP(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-44 md:h-56 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="grid md:grid-cols-3 gap-3">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* ====== Hero interaktif ====== */}
      <section className="relative overflow-hidden rounded-3xl shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Teks */}
          <div className="p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <span className="inline-block h-2 w-2 rounded-full bg-white" /> Profil
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
              {isNewUser
                ? `${me.username || 'Kamu'}, belum ada habit yang kamu ambil.`
                : `Kamu master habit, ${me.username || 'kamu'}!`}
            </h1>
            <p className="mt-2 text-white/90">
              {isNewUser
                ? 'Segera ambil habit pertamamu dan mulai kumpulkan pencapaian!'
                : <>Sudah menyelesaikan <b>{completionTotal}</b> habit. Terus lanjutkan kebiasaan baikmu 💪</>}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {isNewUser ? (
                <>
                  <Link to="/habits" className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-5 py-2.5 font-semibold shadow hover:opacity-95">
                    ➕ Ambil / Tambah Habit
                  </Link>
                  <Link to="/achievements" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
                    🏆 Buat Pencapaian
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/habits" className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-5 py-2.5 font-semibold shadow hover:opacity-95">
                    ✅ Lanjutkan Habit
                  </Link>
                  <Link to="/achievements" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
                    🏆 Lihat Pencapaian
                  </Link>
                  <Link to="/rewards" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
                    🎁 Rewards
                  </Link>
                </>
              )}
            </div>
          </div>
          {/* Ilustrasi */}
          <div className="relative min-h-[240px] lg:min-h-[360px] xl:min-h-[420px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(800px 500px at 60% 50%, rgba(255,255,255,.25), transparent 60%)' }}
            />
            <img
              src={PROFILE_ILLU}
              alt="Ilustrasi profil & kebiasaan personal"
              className="absolute inset-0 h-full w-full object-contain p-6 lg:p-10 select-none"
              draggable="false"
            />
          </div>
        </div>
      </section>

      {/* ====== Ringkasan akun ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard title="Username" value={me.username || '-'} sub={me.email || '-'} />
        <SummaryCard title="Total Habit" value={habitCount} sub={isNewUser ? 'Belum ada habit' : 'Mantap!'} tone="indigo" />
        <SummaryCard title="Habit Selesai (total)" value={completionTotal} sub={completionTotal ? `Update: ${fmtDateWIB(new Date().toISOString())}` : '—'} tone="emerald" />
      </div>

      {/* ====== Kelola Profil ====== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ganti Username */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Ganti Username</h2>
          <p className="text-sm text-gray-500">Ubah nama yang ditampilkan di aplikasi.</p>

          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-gray-700">Username</span>
              <input
                type="text"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={uname}
                onChange={(e) => setUname(e.target.value)}
                placeholder="Masukkan username baru"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleSaveUsername}
                disabled={savingU || !uname.trim()}
                className={`px-4 py-2 rounded-lg text-white ${savingU || !uname.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                title="Simpan username"
              >
                {savingU ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>

        {/* Ganti Password */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Ganti Password</h2>
          <p className="text-sm text-gray-500">Pastikan password baru kuat dan mudah diingat.</p>

          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-gray-700">Password saat ini</span>
              <input
                type="password"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                placeholder="••••••••"
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">Password baru</span>
              <input
                type="password"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                placeholder="Minimal 6 karakter"
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">Konfirmasi password baru</span>
              <input
                type="password"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                placeholder="Ulangi password baru"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleChangePassword}
                disabled={savingP}
                className={`px-4 py-2 rounded-lg text-white ${savingP ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                title="Simpan password baru"
              >
                {savingP ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Alert pesan ====== */}
      {msg && (
        <div
          className={`rounded-xl p-3 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
