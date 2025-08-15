import { useEffect, useState } from 'react';
import { listAchievements, createAchievement, addHabitToAchievement, claimAchievement } from '../api/achievements';

export default function Achievements() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // form card
  const [form, setForm] = useState({ name:'', targetPoints:100, description:'' });
  // form habit (per-card)
  const [addHabitOpen, setAddHabitOpen] = useState(null); // id card atau null
  const [habitForm, setHabitForm] = useState({ title:'', frequency:'Daily', pointsPerCompletion:10 });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAchievements();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.error || 'Gagal memuat pencapaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=> { load(); }, []);

  const onCreateCard = async (e) => {
    e.preventDefault();
    try {
      await createAchievement({
        name: form.name,
        targetPoints: Number(form.targetPoints || 0),
        description: form.description || null
      });
      setForm({ name:'', targetPoints:100, description:'' });
      await load();
      setMsg('Pencapaian dibuat');
    } catch (e) {
      setMsg(e?.error || 'Gagal membuat pencapaian');
    }
  };

  const onAddHabit = async (cardId) => {
    try {
      await addHabitToAchievement(cardId, {
        title: habitForm.title,
        frequency: habitForm.frequency,
        pointsPerCompletion: Number(habitForm.pointsPerCompletion || 0),
      });
      setHabitForm({ title:'', frequency:'Daily', pointsPerCompletion:10 });
      setAddHabitOpen(null);
      await load();
      setMsg('Habit ditambahkan ke pencapaian');
    } catch (e) {
      setMsg(e?.error || 'Gagal menambahkan habit');
    }
  };

  const onClaim = async (card) => {
    try {
      await claimAchievement(card.id);
      await load();
      setMsg(`Berhasil klaim: ${card.name}`);
    } catch (e) {
      setMsg(e?.error || 'Gagal klaim achievement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Buat Pencapaian</h2>
        <form onSubmit={onCreateCard} className="grid md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Nama Pencapaian"
                 value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <input className="border rounded px-3 py-2" type="number" min="0" placeholder="Target Poin"
                 value={form.targetPoints} onChange={e=>setForm({...form, targetPoints:e.target.value})} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Deskripsi (opsional)"
                 value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          <div className="md:col-span-4">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Tambah</button>
          </div>
        </form>
        {msg && <div className="mt-3 p-2 border rounded text-sm">{msg}</div>}
      </div>

      {loading ? <p>Memuat…</p> : (
        <div className="grid md:grid-cols-2 gap-6">
          {items.map(card => {
            const canClaim = (card.stats?.pointBalance ?? 0) >= (card.targetPoints ?? 0);
            return (
              <div key={card.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{card.name}</h3>
                    <p className="text-gray-500 text-sm">Target: {card.targetPoints} poin</p>
                  </div>
                  <button
                    onClick={()=>onClaim(card)}
                    disabled={!canClaim}
                    className={`px-3 py-1 rounded ${canClaim ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    Klaim
                  </button>
                </div>

                {/* progress */}
                <div className="mb-2">
                  <div className="h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-indigo-600 rounded"
                         style={{ width: `${card.stats?.progressPercent ?? 0}%` }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Saldo: {card.stats?.pointBalance ?? 0} •
                    Kontribusi Card: {card.stats?.contributedPoints ?? 0} •
                    Sisa: {card.stats?.remainingPoints ?? 0}
                  </div>
                </div>

                {/* habits list */}
                <div className="mt-3">
                  <div className="font-medium mb-2">Habits</div>
                  {card.habits.length === 0 ? (
                    <div className="text-gray-500 text-sm">Belum ada habit</div>
                  ) : (
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {card.habits.map(h => (
                        <li key={h.id}>{h.title} • {h.frequency} • +{h.pointsPerCompletion}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* add habit form (inline) */}
                {addHabitOpen === card.id ? (
                  <div className="mt-4 border rounded p-3">
                    <div className="grid md:grid-cols-4 gap-2">
                      <input className="border rounded px-2 py-1" placeholder="Nama habit"
                             value={habitForm.title} onChange={e=>setHabitForm({...habitForm, title:e.target.value})} />
                      <select className="border rounded px-2 py-1"
                              value={habitForm.frequency} onChange={e=>setHabitForm({...habitForm, frequency:e.target.value})}>
                        <option>Daily</option>
                        <option>Weekly</option>
                      </select>
                      <input className="border rounded px-2 py-1" type="number" min="0" placeholder="Poin"
                             value={habitForm.pointsPerCompletion}
                             onChange={e=>setHabitForm({...habitForm, pointsPerCompletion:e.target.value})} />
                      <div className="flex gap-2">
                        <button onClick={()=>onAddHabit(card.id)} className="bg-indigo-600 text-white px-3 rounded">Simpan</button>
                        <button onClick={()=>setAddHabitOpen(null)} className="px-3 rounded border">Batal</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setAddHabitOpen(card.id)} className="mt-3 text-indigo-600 hover:underline text-sm">
                    + Tambah Habit
                  </button>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-gray-500">Belum ada pencapaian. Buat di atas.</div>
          )}
        </div>
      )}
    </div>
  );
}
