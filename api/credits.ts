import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { getTokenFromHeader } from '../lib/jwtHelper';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = getTokenFromHeader(req.headers.authorization);
  if (!payload) return res.status(401).json({ error: 'Tidak terautentikasi' });

  // ── GET: cek kredit user saat ini ──────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: user } = await supabase
      .from('users').select('credits, role').eq('id', payload.userId).single();
    return res.status(200).json({ credits: user?.credits ?? 0, role: user?.role ?? 'free' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  // ── Admin: buat user baru ──────────────────────────────────────────────────
  if (action === 'create-user') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { username, password, role = 'free', credits = 0 } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert({
      username: (username as string).toLowerCase().trim(),
      password_hash: hash,
      role,
      credits: Number(credits),
    }).select('id, username, role, credits').single();

    if (error) return res.status(400).json({ error: 'Username sudah digunakan atau terjadi kesalahan' });
    return res.status(200).json({ success: true, user: data });
  }

  // ── Admin: tambah kredit manual ───────────────────────────────────────────
  if (action === 'add-credits') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { targetUsername, amount, reason = 'top-up manual oleh admin' } = req.body;
    if (!targetUsername || !amount) return res.status(400).json({ error: 'targetUsername dan amount wajib diisi' });

    const { data: target } = await supabase
      .from('users').select('*').eq('username', (targetUsername as string).toLowerCase().trim()).single();
    if (!target) return res.status(404).json({ error: `User "${targetUsername}" tidak ditemukan` });

    const newCredits = (target.credits ?? 0) + Number(amount);
    await supabase.from('users').update({ credits: newCredits, updated_at: new Date().toISOString() }).eq('id', target.id);
    await supabase.from('credit_logs').insert({ user_id: target.id, delta: Number(amount), reason });

    return res.status(200).json({ success: true, username: target.username, newCredits });
  }

  // ── Admin: daftar semua user ───────────────────────────────────────────────
  if (action === 'list-users') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { data } = await supabase
      .from('users')
      .select('id, username, role, credits, created_at')
      .order('created_at', { ascending: false });
    return res.status(200).json({ users: data ?? [] });
  }

  // ── Admin: update role user ────────────────────────────────────────────────
  if (action === 'update-role') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { targetUsername, role } = req.body;
    if (!targetUsername || !role) return res.status(400).json({ error: 'targetUsername dan role wajib' });
    if (!['free', 'pro', 'admin'].includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    const { error } = await supabase
      .from('users').update({ role, updated_at: new Date().toISOString() })
      .eq('username', (targetUsername as string).toLowerCase().trim());
    if (error) return res.status(400).json({ error: 'Gagal update role' });
    return res.status(200).json({ success: true });
  }

  // ── Admin: reset password user ────────────────────────────────────────────
  if (action === 'reset-password') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { targetUsername, newPassword } = req.body;
    if (!targetUsername || !newPassword) return res.status(400).json({ error: 'targetUsername dan newPassword wajib' });
    if ((newPassword as string).length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const hash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('users').update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('username', (targetUsername as string).toLowerCase().trim());
    if (error) return res.status(400).json({ error: 'User tidak ditemukan atau gagal update' });
    return res.status(200).json({ success: true });
  }

  // ── Admin: riwayat kredit user ─────────────────────────────────────────────
  if (action === 'credit-logs') {
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { targetUsername } = req.body;
    const { data: target } = await supabase
      .from('users').select('id').eq('username', (targetUsername as string).toLowerCase().trim()).single();
    if (!target) return res.status(404).json({ error: 'User tidak ditemukan' });

    const { data } = await supabase
      .from('credit_logs').select('*').eq('user_id', target.id)
      .order('created_at', { ascending: false }).limit(50);
    return res.status(200).json({ logs: data ?? [] });
  }

  return res.status(400).json({ error: 'Action tidak valid' });
}
