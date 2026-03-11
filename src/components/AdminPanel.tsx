import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface UserRow {
  id:         string;
  username:   string;
  role:       string;
  credits:    number;
  created_at: string;
}

interface Props {
  token:   string;
  onClose: () => void;
}

type Tab = 'users' | 'create' | 'credits' | 'pw';

export default function AdminPanel({ token, onClose }: Props) {
  const [tab,       setTab]       = useState<Tab>('users');
  const [users,     setUsers]     = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  // Buat user baru
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole,     setNewRole]     = useState('free');
  const [newCredits,  setNewCredits]  = useState('0');

  // Tambah kredit
  const [topupUser,   setTopupUser]   = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupReason, setTopupReason] = useState('top-up manual admin');

  // Reset password
  const [pwUser,   setPwUser]   = useState('');
  const [pwNew,    setPwNew]    = useState('');

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const api = async (action: string, body: Record<string, unknown>) => {
    const res  = await fetch('/api/credits', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ action, ...body }),
    });
    return res.json();
  };

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await api('list-users', {});
    setUsers(data.users ?? []);
    setIsLoading(false);
  };

  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab]);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) return;
    const data = await api('create-user', { username: newUsername, password: newPassword, role: newRole, credits: Number(newCredits) });
    if (data.success) {
      flash(`✅ User "${data.user.username}" berhasil dibuat`);
      setNewUsername(''); setNewPassword(''); setNewRole('free'); setNewCredits('0');
      loadUsers();
    } else flash(`❌ ${data.error}`, false);
  };

  const handleTopup = async () => {
    if (!topupUser || !topupAmount) return;
    const data = await api('add-credits', { targetUsername: topupUser, amount: Number(topupAmount), reason: topupReason });
    if (data.success) {
      flash(`✅ ${topupAmount} kredit ditambahkan ke "${data.username}". Total: ${data.newCredits}`);
      setTopupUser(''); setTopupAmount('');
      loadUsers();
    } else flash(`❌ ${data.error}`, false);
  };

  const handleRoleChange = async (username: string, role: string) => {
    const data = await api('update-role', { targetUsername: username, role });
    if (data.success) { flash(`✅ Role "${username}" diubah ke ${role}`); loadUsers(); }
    else flash(`❌ ${data.error}`, false);
  };

  const handleResetPw = async () => {
    if (!pwUser || !pwNew) return;
    // Admin langsung set password baru tanpa current password
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'reset-password', targetUsername: pwUser, newPassword: pwNew }),
    });
    const data = await res.json();
    if (data.success) { flash(`✅ Password "${pwUser}" berhasil direset`); setPwUser(''); setPwNew(''); }
    else flash(`❌ ${data.error}`, false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users',  label: '👥 Users'    },
    { id: 'create', label: '➕ Buat User' },
    { id: 'credits',label: '💎 Top Up'   },
    { id: 'pw',     label: '🔒 Reset PW'  },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-gray-800 border border-yellow-700/50 rounded-2xl my-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400">👑 Panel Admin</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
        </div>

        {/* Flash message */}
        {msg && (
          <div className={`mx-6 mt-4 text-xs rounded-lg px-4 py-2.5 ${msg.ok ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-red-900/30 text-red-300 border border-red-700/50'}`}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${tab === t.id ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-700/50 text-zinc-400 border-gray-600 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Tab: Users ── */}
          {tab === 'users' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-300">{users.length} user terdaftar</p>
                <button onClick={loadUsers} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">🔄 Refresh</button>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-500 border-b border-gray-700">
                        <th className="text-left pb-2 pr-3">Username</th>
                        <th className="text-left pb-2 pr-3">Role</th>
                        <th className="text-right pb-2 pr-3">Kredit</th>
                        <th className="text-left pb-2">Bergabung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-700/40 hover:bg-gray-700/20">
                          <td className="py-2.5 pr-3 font-medium text-zinc-200">{u.username}</td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u.username, e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="free">free</option>
                              <option value="pro">pro</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <span className={`font-bold ${u.credits === 0 ? 'text-red-400' : u.credits < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {u.credits}
                            </span>
                          </td>
                          <td className="py-2.5 text-zinc-500">
                            {new Date(u.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Buat User ── */}
          {tab === 'create' && (
            <div className="flex flex-col gap-4 max-w-sm">
              <p className="text-sm text-zinc-400">Buat akun baru untuk user</p>
              {[
                { label: 'Username', value: newUsername, set: setNewUsername, type: 'text', placeholder: 'cth: user_budi' },
                { label: 'Password', value: newPassword, set: setNewPassword, type: 'password', placeholder: 'Min. 6 karakter' },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)}
                    className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">Kredit awal</label>
                  <input type="number" min="0" value={newCredits} onChange={e => setNewCredits(e.target.value)}
                    className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!newUsername || !newPassword}
                className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-yellow-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                ➕ Buat User
              </button>
            </div>
          )}

          {/* ── Tab: Top Up Kredit ── */}
          {tab === 'credits' && (
            <div className="flex flex-col gap-4 max-w-sm">
              <p className="text-sm text-zinc-400">Tambah kredit manual ke user</p>
              {[
                { label: 'Username target', value: topupUser, set: setTopupUser, type: 'text', placeholder: 'Nama user' },
                { label: 'Jumlah kredit', value: topupAmount, set: setTopupAmount, type: 'number', placeholder: 'cth: 50' },
                { label: 'Keterangan', value: topupReason, set: setTopupReason, type: 'text', placeholder: 'top-up manual admin' },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <button onClick={handleTopup} disabled={!topupUser || !topupAmount}
                className="w-full bg-gradient-to-r from-green-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-green-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                💎 Tambah Kredit
              </button>
            </div>
          )}

          {/* ── Tab: Reset Password ── */}
          {tab === 'pw' && (
            <div className="flex flex-col gap-4 max-w-sm">
              <p className="text-sm text-zinc-400">Reset password user tanpa perlu password lama</p>
              {[
                { label: 'Username', value: pwUser, set: setPwUser, type: 'text', placeholder: 'Nama user target' },
                { label: 'Password Baru', value: pwNew, set: setPwNew, type: 'password', placeholder: 'Min. 6 karakter' },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <button onClick={handleResetPw} disabled={!pwUser || !pwNew}
                className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-yellow-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                🔒 Reset Password
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
