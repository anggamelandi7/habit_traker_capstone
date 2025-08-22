// src/pages/Logout.jsx
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Hapus seluruh jejak login yang kita pakai di FE */
function clearAuthStorage() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('claimGuard.v1'); // guard anti-respawn reward (kalau ada)
    sessionStorage.removeItem('justClaimed'); // flag yang pernah dipakai di Dashboard
  } catch {
    /* ignore */
  }
}

export default function Logout() {
  const navigate = useNavigate();

  const handleCancel = useCallback(() => {
    // kembali ke halaman sebelumnya; kalau tidak ada, ke dashboard
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleConfirm = useCallback(() => {
    clearAuthStorage();
    navigate('/login', { replace: true });
  }, [navigate]);

  // Aksesibilitas: ESC = batal, Enter = konfirmasi
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCancel, handleConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Modal card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            {/* ikon keluar sederhana */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center">Keluar dari apliasi?</h1>
          <p className="mt-1 text-center text-sm text-gray-600">
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Ya
          </button>
        </div>
      </div>
    </div>
  );
}
