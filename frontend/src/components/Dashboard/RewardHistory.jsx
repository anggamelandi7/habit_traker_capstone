// components/Dashboard/RewardHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function RewardHistory({ token }) {
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/rewards', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setRewards(res.data));
  }, [token]);

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Riwayat Reward</h2>
      <ul className="divide-y">
        {rewards.map((r, idx) => (
          <li key={idx} className="py-2 text-sm text-gray-700">
            🎁 {r.name || r.title} - {r.points} pts
          </li>
        ))}
      </ul>
    </div>
  );
}
