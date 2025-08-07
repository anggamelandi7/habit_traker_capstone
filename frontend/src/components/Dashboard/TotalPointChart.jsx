// components/Dashboard/TotalPointCard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function TotalPointCard({ token }) {
  const [data, setData] = useState({ totalPoints: 0, badge: '' });

  useEffect(() => {
    axios.get('http://localhost:5000/rewards/total', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setData(res.data));
  }, [token]);

  return (
    <div className="bg-indigo-600 text-white p-6 rounded-xl shadow text-center">
      <h2 className="text-lg">Total Poin</h2>
      <p className="text-4xl font-bold mt-2">{data.totalPoints}</p>
      <p className="mt-1 text-sm italic">Badge: {data.badge}</p>
    </div>
  );
}
