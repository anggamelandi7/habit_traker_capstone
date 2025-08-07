// components/Dashboard/HabitSummaryCard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function HabitSummaryCard({ token }) {
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    axios.get('http://localhost:5000/habits/summary', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setSummary(res.data));
  }, [token]);

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Ringkasan Habit</h2>
      <ul className="space-y-1 text-gray-700">
        <li>Total Habit: {summary.total}</li>
        <li>Selesai: {summary.completed}</li>
        <li>Pending: {summary.pending}</li>
      </ul>
    </div>
  );
}
