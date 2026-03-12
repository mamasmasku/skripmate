import bcrypt from 'bcryptjs';
import { supabase } from './lib/supabase.js';
import { signToken, getTokenFromHeader } from './lib/jwtHelper.js';

export default async function handler(req: any, res: any) {
  // CORS untuk iframe Blogger
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  // ── Login ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', (username as string).toLowerCase().trim())
      .single();

    if (error || !user)
      return res.status(401).json({ error: 'Username atau password salah' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Username atau password salah' });

    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username, role: user.role, credits: user.credits },
    });
  }

  // ── Ganti Password ────────────────────────────────────────────────────────
  if (action === 'change-password') {
    const authPayload = getTokenFromHeader(req.headers.authorization);
    if (!authPayload) return res.status(401).json({ error: 'Tidak terautentikasi' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
    if ((newPassword as string).length < 6)
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });

    const { data: user } = await supabase
      .from('users').select('*').eq('id', authPayload.userId).single();
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });

    const hash = await bcrypt.hash(newPassword, 10);
    await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', authPayload.userId);
    return res.status(200).json({ success: true });
  }

  // ── Me (refresh user info) ────────────────────────────────────────────────
  if (action === 'me') {
    const authPayload = getTokenFromHeader(req.headers.authorization);
    if (!authPayload) return res.status(401).json({ error: 'Tidak terautentikasi' });

    const { data: user } = await supabase
      .from('users').select('id, username, role, credits').eq('id', authPayload.userId).single();
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    return res.status(200).json({ user });
  }

  return res.status(400).json({ error: 'Action tidak valid' });
}
