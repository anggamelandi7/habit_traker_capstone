import { useEffect, useState } from 'react';
import { getHabits, completeHabit, createHabit } from '../api/habits';
import { listAchievements, addHabitToAchievement } from '../api/achievements';

export default function Habits() {
  const [items, setItems] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // form tambah habit
  const [form, setForm] = useState({
    title: '',
    frequency: 'Daily',
    pointsPerCompletion: 10,
    achievementId: '' // '' = tanpa pencapaian
  });

  const load = async () => {
    setLoading(true);
    try {
      const [habits, achs] = await Promise.all([
        getHabits(),
        listAchievements().catch(()=>[]) // kalau belum ada achievements
      ]);
      setItems(Array.isArray(habits) ? habits : []);
      setAchievements(Array.isArray(achs) ? achs : []);
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat habits');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        frequency: form.frequency,
        pointsPerCompletion: Number(form.pointsPerCompletion || 0),
      };

      if (form.achievementId) {
        await addHabitToAchievement(Number(form.achievementId), payload);
      } else {
        await createHabit(payload);
      }

      setForm({ title:'', frequency:'Daily', pointsPerCompletion:10, achievementId:'' });
      await load();
      setMsg('Habit dibuat');
    } catch (e) { setMsg(e?.error || 'Gagal membuat habit'); }
  };

  const onComplete = async (h) => {
    try {
      const res = await completeHabit(h.id);
      setMsg(`✔ ${h.title} — +${res.addedPoints} poin. Total: ${res.newBalance}`);
      await load();
    } catch (e) { setMsg(e?.error || 'Gagal menyelesaikan habit'); }
  };

  return (
    <div style={{padding:16}}>
      <h2 className="text-xl font-semibold mb-3">Habits</h2>

      {/* Form tambah habit */}
      <form onSubmit={onCreate} className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="Nama habit"
          value={form.title}
          onChange={e=>setForm({...form, title:e.target.value})}
          required
        />
        <select
          className="border rounded px-3 py-2"
          value={form.frequency}
          onChange={e=>setForm({...form, frequency:e.target.value})}
        >
          <option>Daily</option>
          <option>Weekly</option>
        </select>
        <input
          className="border rounded px-3 py-2 w-32"
          type="number" min="0"
          placeholder="Poin"
          value={form.pointsPerCompletion}
          onChange={e=>setForm({...form, pointsPerCompletion:e.target.value})}
        />

        {/* Dropdown Assign ke Achievement */}
        <select
          className="border rounded px-3 py-2"
          value={form.achievementId}
          onChange={e=>setForm({...form, achievementId:e.target.value})}
        >
          <option value="">— Tanpa Pencapaian —</option>
          {achievements.map(a => (
            <option key={a.id} value={a.id}>{a.name} (target {a.targetPoints})</option>
          ))}
        </select>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Tambah
        </button>
      </form>

      {msg && <div className="mb-3 p-2 border rounded text-sm">{msg}</div>}
      {loading ? <p>memuat…</p> : (
        <div className="grid gap-2">
          {items.map(h => (
            <div key={h.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-semibold">{h.title}</div>
                <div className="text-xs text-gray-600">
                  {h.frequency} • +{h.pointsPerCompletion} poin
                  {h.achievementId ? (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-indigo-50 border border-indigo-200">
                      Card #{h.achievementId}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={()=>onComplete(h)}
                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Selesai
              </button>
            </div>
          ))}
          {items.length===0 && <div className="text-gray-500">Belum ada habit. Tambahkan di atas.</div>}
        </div>
      )}
    </div>
  );
}
