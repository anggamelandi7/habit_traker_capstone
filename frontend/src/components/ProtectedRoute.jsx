import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getLedgerSummary } from '../api/rewards';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Tidak ada token → langsung tidak authorized
    if (!token) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    // Verifikasi ringan ke endpoint yang butuh auth
    (async () => {
      try {
        await getLedgerSummary();      // GET /points/ledger
        setAuthorized(true);           // sukses → authorized
      } catch (e) {
        // Hanya logout jika benar-benar 401 dari server
        if (e?.status === 401) {
          localStorage.removeItem('token');
          setAuthorized(false);
        } else {
          // Error jaringan/500/dll → jangan paksa logout
          // Kita anggap authorized agar UI tetap bisa tampil
          setAuthorized(true);
          // (Opsional: bisa tampilkan banner "API bermasalah")
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sambil nunggu verifikasi → jangan render apa-apa (bisa diganti skeleton)
  if (loading) return null;

  // Jika tidak authorized → tendang ke login
  if (!authorized) return <Navigate to="/login" replace />;

  // Authorized → render halaman
  return children;
}
