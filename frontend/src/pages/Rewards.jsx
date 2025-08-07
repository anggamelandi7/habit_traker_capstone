import { useEffect, useState } from 'react';
import API from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [user, setUser] = useState({});
  const [message, setMessage] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  const fetchData = async () => {
    try {
      const [resUser, resRewards] = await Promise.all([
        API.get('/users/me'),
        API.get('/rewards')
      ]);
      setUser(resUser.data);
      setRewards(resRewards.data);
    } catch (err) {
      alert('Session expired. Silakan login ulang.');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  const handleClaim = async (rewardId) => {
    setLoadingId(rewardId);
    setMessage('');

    try {
      const res = await API.post(`/rewards/claim/${rewardId}`);
      setMessage(res.data.message || 'Reward berhasil diklaim!');
      fetchData(); // refresh points + reward list
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal klaim reward');
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">🎁 Rewards</h1>
        <p className="text-gray-600">Tukar poinmu dengan reward yang tersedia.</p>
      </div>

      <div className="mb-4 p-4 bg-white rounded shadow max-w-sm">
        <span className="text-gray-700 font-semibold">Total Poin Kamu:</span>
        <h2 className="text-2xl font-bold text-indigo-600">{user.totalPoints ?? 0}</h2>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded">
          {message}
        </div>
      )}

      <div className="grid gap-4 max-w-xl">
        {rewards.length === 0 ? (
          <p className="text-gray-500">Belum ada reward tersedia.</p>
        ) : (
          rewards.map((reward) => {
            const canClaim = (user.totalPoints ?? 0) >= reward.points;

            return (
              <div
                key={reward.id}
                className="flex justify-between items-center bg-white px-4 py-3 rounded shadow"
              >
                <div>
                  <h3 className="font-semibold text-gray-800">{reward.name}</h3>
                  <p className="text-sm text-gray-500">🎯 {reward.points} poin</p>
                </div>
                <button
                  onClick={() => handleClaim(reward.id)}
                  disabled={!canClaim || loadingId === reward.id}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    canClaim
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loadingId === reward.id ? 'Memproses...' : 'Klaim'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </MainLayout>
  );
}
