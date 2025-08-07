// components/Dashboard/ProgressChart.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ token }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/habits/progress', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setData(res.data));
  }, [token]);

  return (
    <div className="bg-white p-6 rounded-xl shadow w-full h-80">
      <h2 className="text-xl font-semibold mb-4">Progres Mingguan</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
