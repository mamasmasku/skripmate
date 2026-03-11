import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { getTokenFromHeader } from '../lib/jwtHelper';

const SERVER_KEY     = process.env.MIDTRANS_SERVER_KEY!;
const IS_PRODUCTION  = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const SNAP_BASE_URL  = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';
const API_BASE_URL   = IS_PRODUCTION
  ? 'https://api.midtrans.com/v2'
  : 'https://api.sandbox.midtrans.com/v2';

export const CREDIT_PACKAGES = [
  { id: 'pack_50',  credits: 50,  price: 10000, label: '50 Kredit',  bonus: '' },
  { id: 'pack_120', credits: 120, price: 25000, label: '120 Kredit', bonus: 'Hemat 17%' },
  { id: 'pack_300', credits: 300, price: 50000, label: '300 Kredit', bonus: 'Hemat 33%' },
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/payment?action=packages ──────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({ packages: CREDIT_PACKAGES });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  // ── Buat transaksi baru ────────────────────────────────────────────────────
  if (action === 'create') {
    const payload = getTokenFromHeader(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: 'Tidak terautentikasi' });

    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: 'Paket tidak valid' });

    const orderId = `SM-${payload.userId.slice(0, 8).toUpperCase()}-${Date.now()}`;

    // Simpan transaksi pending dulu
    const { data: txn, error: txnError } = await supabase.from('transactions').insert({
      user_id: payload.userId,
      package_id: pkg.id,
      credits: pkg.credits,
      price_idr: pkg.price,
      midtrans_order_id: orderId,
      status: 'pending',
    }).select().single();

    if (txnError) return res.status(500).json({ error: 'Gagal membuat transaksi' });

    // Panggil Midtrans Snap API
    const b64Key = Buffer.from(`${SERVER_KEY}:`).toString('base64');
    const midtransRes = await fetch(`${SNAP_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${b64Key}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: pkg.price },
        item_details: [{
          id:       pkg.id,
          price:    pkg.price,
          quantity: 1,
          name:     `ScriptMate - ${pkg.label}`,
        }],
        customer_details: { first_name: payload.username },
        callbacks: {
          finish:  `${process.env.APP_URL ?? ''}/payment-success`,
        },
      }),
    });

    const midtransData = (await midtransRes.json()) as any;
    if (!midtransData.token) {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', txn!.id);
      return res.status(500).json({ error: 'Gagal membuat halaman pembayaran Midtrans' });
    }

    // Simpan snap token
    await supabase.from('transactions').update({ midtrans_token: midtransData.token }).eq('id', txn!.id);

    return res.status(200).json({ snapToken: midtransData.token, orderId });
  }

  // ── Webhook dari Midtrans ─────────────────────────────────────────────────
  if (action === 'webhook') {
    const {
      order_id, transaction_status, fraud_status,
      signature_key, gross_amount, status_code, payment_type,
    } = req.body;

    // Verifikasi signature Midtrans
    const expected = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${SERVER_KEY}`)
      .digest('hex');
    if (expected !== signature_key) {
      return res.status(400).json({ error: 'Signature tidak valid' });
    }

    const { data: txn } = await supabase
      .from('transactions').select('*').eq('midtrans_order_id', order_id).single();
    if (!txn) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    if (
      (transaction_status === 'capture' || transaction_status === 'settlement') &&
      (fraud_status === 'accept' || fraud_status === undefined)
    ) {
      if (txn.status === 'pending') {
        const { data: user } = await supabase
          .from('users').select('credits').eq('id', txn.user_id).single();
        const newCredits = (user?.credits ?? 0) + txn.credits;

        await supabase.from('users').update({
          credits:    newCredits,
          role:       'pro',       // otomatis upgrade ke pro setelah beli
          updated_at: new Date().toISOString(),
        }).eq('id', txn.user_id);

        await supabase.from('transactions').update({
          status:         'paid',
          payment_method: payment_type,
          paid_at:        new Date().toISOString(),
        }).eq('id', txn.id);

        await supabase.from('credit_logs').insert({
          user_id: txn.user_id,
          delta:   txn.credits,
          reason:  `pembelian paket ${txn.package_id} (${order_id})`,
        });
      }
    } else if (transaction_status === 'expire') {
      await supabase.from('transactions').update({ status: 'expired' }).eq('id', txn.id);
    } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', txn.id);
    }

    return res.status(200).json({ status: 'ok' });
  }

  // ── Cek status transaksi (polling setelah Snap ditutup) ───────────────────
  if (action === 'check-status') {
    const payload = getTokenFromHeader(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: 'Tidak terautentikasi' });

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId wajib' });

    const { data: txn } = await supabase
      .from('transactions').select('status, credits').eq('midtrans_order_id', orderId).eq('user_id', payload.userId).single();
    if (!txn) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    // Kalau masih pending, cek langsung ke Midtrans
    if (txn.status === 'pending') {
      const b64Key = Buffer.from(`${SERVER_KEY}:`).toString('base64');
      const statusRes = await fetch(`${API_BASE_URL}/${orderId}/status`, {
        headers: { 'Authorization': `Basic ${b64Key}` },
      });
      const statusData = (await statusRes.json()) as any;

      if (statusData.transaction_status === 'settlement' || statusData.transaction_status === 'capture') {
        // Proses lewat webhook logic yang sama
        const { data: user } = await supabase.from('users').select('credits').eq('id', payload.userId).single();
        const newCredits = (user?.credits ?? 0) + txn.credits;
        await supabase.from('users').update({ credits: newCredits, role: 'pro', updated_at: new Date().toISOString() }).eq('id', payload.userId);
        await supabase.from('transactions').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('midtrans_order_id', orderId);
        await supabase.from('credit_logs').insert({ user_id: payload.userId, delta: txn.credits, reason: `pembelian (check-status ${orderId})` });

        return res.status(200).json({ status: 'paid', credits: newCredits });
      }
    }

    // Ambil kredit terbaru
    const { data: user } = await supabase.from('users').select('credits').eq('id', payload.userId).single();
    return res.status(200).json({ status: txn.status, credits: user?.credits ?? 0 });
  }

  return res.status(400).json({ error: 'Action tidak valid' });
}
