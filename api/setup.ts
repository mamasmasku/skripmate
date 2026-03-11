/**
 * POST /api/setup
 * Endpoint satu kali untuk membuat admin pertama.
 * Akan GAGAL jika sudah ada admin di database (keamanan).
 *
 * Body: { setupKey, username, password }
 * setupKey harus cocok dengan SETUP_SECRET_KEY di environment variable.
 */
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { setupKey, username, password } = req.body;

  // Cek setup key
  const validKey = process.env.SETUP_SECRET_KEY;
  if (!validKey || setupKey !== validKey)
    return res.status(403).json({ error: 'Setup key tidak valid' });

  // Cegah jika admin sudah ada
  const { data: existingAdmin } = await supabase
    .from('users').select('id').eq('role', 'admin').limit(1).single();
  if (existingAdmin)
    return res.status(400).json({ error: 'Admin sudah ada. Endpoint ini hanya bisa dipakai sekali.' });

  if (!username || !password)
    return res.status(400).json({ error: 'Username dan password wajib' });
  if ((password as string).length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert({
    username: (username as string).toLowerCase().trim(),
    password_hash: hash,
    role: 'admin',
    credits: 9999,
  }).select('id, username, role').single();

  if (error) return res.status(400).json({ error: 'Gagal membuat admin: ' + error.message });

  return res.status(200).json({
    success: true,
    message: `Admin "${data.username}" berhasil dibuat. Hapus atau amankan endpoint ini sekarang!`,
    user: data,
  });
}
