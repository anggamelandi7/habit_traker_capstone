import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAchievements, claimAchievement } from '../api/achievements';

export default function Rewards() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAchievements();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat data pencapaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onClaim = async (card) => {
    try {
      await claimAchievement(card.id);
      setMsg(`Berhasil klaim: ${card.name}`);
      await load();
    } catch (e) {
      setMsg(e?.error || 'Gagal klaim pencapaian');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Monitor Pencapaian</h2>
          <p className="text-gray-600 text-sm">
            Lihat progres pencapaianmu dan klaim hadiah saat poin sudah mencukupi.
          </p>
        </div>
        <Link
          to="/achievements"
          className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition"
        >
          + Buat / Kelola Pencapaian
        </Link>
      </div>

      {msg && <div className="p-2 border rounded text-sm">{msg}</div>}
      {loading ? (
        <div>Memuat…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {items.map(card => {
            const balance = Number(card?.stats?.pointBalance ?? 0);
            const target  = Number(card?.targetPoints ?? 0);
            const canClaim = balance >= target && target > 0;
            const percent = Number(card?.stats?.progressPercent ?? 0);
            const remaining = Number(card?.stats?.remainingPoints ?? 0);
            const contributed = Number(card?.stats?.contributedPoints ?? 0);

            return (
              <div key={card.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{card.name}</h3>
                    <p className="text-gray-500 text-sm">Target: {target} poin</p>
                  </div>
                  <button
                    onClick={() => onClaim(card)}
                    disabled={!canClaim}
                    className={`px-3 py-1 rounded ${
                      canClaim
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Klaim
                  </button>
                </div>

                {/* progress */}
                <div className="mb-2">
                  <div className="h-2 bg-gray-200 rounded">
                    <div
                      className="h-2 bg-indigo-600 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Saldo: {balance} • Kontribusi Card: {contributed} • Sisa: {remaining}
                  </div>
                </div>

                {/* ringkas habits */}
                <div className="mt-3">
                  <div className="font-medium mb-2">Habits</div>
                  {card.habits?.length ? (
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {card.habits.map(h => (
                        <li key={h.id}>
                          {h.title} • {h.frequency} • +{h.pointsPerCompletion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500 text-sm">Belum ada habit di card ini</div>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-gray-500">
              Belum ada pencapaian. Buat dulu di halaman&nbsp;
              <Link to="/achievements" className="text-indigo-600 underline">Achievements</Link>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}