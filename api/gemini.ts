import OpenAI from 'openai';
import { supabase } from './lib/supabase.js';
import { getTokenFromHeader } from './lib/jwtHelper.js';

const GEMINI_DIRECT_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const LITELLM_URL       = 'https://litellm.koboi2026.biz.id/v1';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    userPrompt,
    systemInstruction,
    temperature = 0.8,
    useSearch   = false,   // ✅ akan dipakai di bawah
    creditCost  = 1,
    userApiKey,            // hanya untuk free user
  } = req.body;

  if (!userPrompt || !systemInstruction)
    return res.status(400).json({ error: 'userPrompt dan systemInstruction wajib diisi' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const payload = getTokenFromHeader(req.headers.authorization);
  if (!payload) return res.status(401).json({ error: 'Sesi habis, silakan login ulang' });

  let apiKeyToUse: string;
  let baseURL: string;
  let currentCredits = 0;

  if (payload.role === 'free') {
    // Free: wajib pakai API key sendiri, tidak potong kredit
    if (!userApiKey)
      return res.status(400).json({ error: 'Mode Free membutuhkan Gemini API Key sendiri' });
    apiKeyToUse = userApiKey;
    baseURL     = GEMINI_DIRECT_URL;
  } else {
    // Pro / Admin: pakai server key, cek dan potong kredit
    const { data: user } = await supabase
      .from('users').select('credits').eq('id', payload.userId).single();
    currentCredits = user?.credits ?? 0;

    if (currentCredits < creditCost)
      return res.status(402).json({
        error: `Kredit tidak cukup. Dibutuhkan ${creditCost} kredit, kamu punya ${currentCredits}. Silakan top up.`,
        credits: currentCredits,
      });

    apiKeyToUse = process.env.GEMINI_API_KEY!;
    baseURL     = LITELLM_URL;
  }

  // ── Panggil Gemini ────────────────────────────────────────────────────────
  try {
    const client = new OpenAI({ apiKey: apiKeyToUse, baseURL });

    // ✅ Google Search Grounding hanya untuk free user (direct Gemini endpoint)
    // Pro/admin lewat LiteLLM — tidak diaktifkan karena konfigurasi server di luar kendali
    const shouldUseSearch = useSearch && payload.role === 'free';

    const response = await client.chat.completions.create({
      model:       'gemini-2.5-flash',
      temperature: temperature as number,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user',   content: userPrompt },
      ],
      ...(shouldUseSearch && {
        tools: [{ googleSearch: {} } as any],
      }),
    });

    const text = response.choices[0]?.message?.content ?? '';

    // ── Potong kredit setelah sukses (hanya pro/admin) ─────────────────────
    let newCredits = currentCredits;
    if (payload.role !== 'free' && creditCost > 0) {
      newCredits = Math.max(0, currentCredits - creditCost);
      await supabase.from('users')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('id', payload.userId);
      await supabase.from('credit_logs').insert({
        user_id: payload.userId,
        delta:   -creditCost,
        reason:  `generate prompt (cost=${creditCost})`,
      });
    }

    return res.status(200).json({ text, credits: newCredits });

  } catch (error: any) {
    console.error('Gemini error:', error);

    const msg: string = error?.message ?? '';
    if (
      msg.includes('API_KEY') || msg.includes('API key') ||
      error?.status === 401   || error?.status === 403
    ) {
      return res.status(401).json({
        error: payload.role === 'free'
          ? 'API Key tidak valid. Periksa kembali Gemini API Key kamu.'
          : 'Kesalahan server API. Hubungi admin.',
      });
    }

    return res.status(500).json({ error: msg || 'Terjadi kesalahan pada server' });
  }
}
