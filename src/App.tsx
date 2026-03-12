/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Input from './components/Input';
import Select from './components/Select';
import StyleButton from './components/StyleButton';
import Textarea from './components/Textarea';
import SkripJualanForm from './modes/skrip-jualan/components/SkripJualanForm';
import SkripJualanOutput from './modes/skrip-jualan/components/SkripJualanOutput';
import { buildSkripJualanSystemPrompt, buildSkripJualanUserPrompt } from './modes/skrip-jualan/buildSkripJualanPrompt';
import type { SkripJualanConfig } from './modes/skrip-jualan/types';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import CreditDisplay from './components/CreditDisplay';
import BuyCreditsModal from './components/BuyCreditsModal';
import AdminPanel from './components/AdminPanel';

// ── Konstanta ─────────────────────────────────────────────────────────────
const FREE_API_KEY_STORAGE = 'gemini_api_key_scriptmate';

const contentStyles = [
  { id: 'ugc',              number: 1, title: 'UGC (User Generated Content)', description: 'Terasa dibuat oleh pengguna biasa, otentik dan jujur.' },
  { id: 'storytelling',     number: 2, title: 'Storytelling',                  description: 'Memiliki alur cerita yang jelas untuk membangun emosi.' },
  { id: 'soft-selling',     number: 3, title: 'Soft Selling',                  description: 'Edukasi halus & informatif, fokus pada manfaat.' },
  { id: 'problem-solution', number: 4, title: 'Problem–Solution',              description: 'Mulai dari masalah yang relevan dengan audiens.' },
  { id: 'cinematic',        number: 5, title: 'Cinematic',                     description: 'Visual dominan, minim dialog, membangun kesan premium.' },
  { id: 'listicle',         number: 6, title: 'Listicle',                      description: 'Informasi terstruktur & jelas, mudah dipahami.' },
];

const characterAppearanceOptions = [
  { id: 'adegan-1-2',             label: 'Adegan 1 & 2',                       description: 'Karakter on-screen di 2 adegan pertama tiap segmen' },
  { id: 'adegan-1-saja',          label: 'Adegan 1 saja',                      description: 'Karakter on-screen hanya di adegan pembuka tiap segmen' },
  { id: 'adegan-1-dan-penutup',   label: 'Adegan 1 & penutup segmen terakhir', description: 'On-screen di adegan 1 tiap segmen + adegan terakhir segmen terakhir' },
  { id: 'adegan-1-2-dan-penutup', label: 'Adegan 1, 2 & penutup segmen terakhir', description: 'On-screen di adegan 1 & 2 tiap segmen + adegan terakhir segmen terakhir' },
];

const dialogStrategyOptions = [
  { id: 'voice-over-penuh', label: 'Voice Over Penuh',           description: 'Dialog berjalan di semua adegan sepanjang video.' },
  { id: 'hanya-on-screen',  label: 'Dialog Hanya Saat On-Screen', description: 'Dialog hanya ada saat karakter muncul di layar.' },
];

// ── Credit cost helpers ───────────────────────────────────────────────────
const calcCreditCost = (
  promptMode: string,
  totalDuration: string,
  segmentDuration: string,
  contentCount: string,
  scriptInput: string,
): number => {
  if (promptMode === 'bebas' || promptMode === 'rapi') {
    const segs = Math.ceil(parseInt(totalDuration || '45') / parseInt(segmentDuration || '15'));
    return segs * Math.max(1, parseInt(contentCount || '1'));
  }
  if (promptMode === 'urai') {
    const maxWords = segmentDuration === '10' ? 35 : 48;
    const wordCount = scriptInput.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / maxWords));
  }
  return 1;
};

// ── Semua fungsi builder prompt — identik dengan versi asli ──────────────

const countDialogWords = (segmentText: string): number => {
  const dialogMatches = segmentText.match(/Dialog:\s*"([^"]+)"/g) || [];
  const allDialog = dialogMatches.map(d => d.replace(/Dialog:\s*"/, '').replace(/"$/, '').trim()).filter(d => d.length > 0).join(' ');
  return allDialog.trim().split(/\s+/).filter(Boolean).length;
};

const validateDialogLength = (promptText: string, segDuration: string, isUrai = false): string[] => {
  const maxWords = isUrai ? (segDuration === '10' ? 35 : 48) : (segDuration === '10' ? 28 : 40);
  const segments = promptText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
  return segments.map((seg, i) => {
    const wordCount = countDialogWords(seg);
    if (wordCount > maxWords) return `Segmen ${i + 1}: ${wordCount} kata (batas ${maxWords} kata untuk ${segDuration} detik)`;
    return null;
  }).filter(Boolean) as string[];
};

const getSegmentWordCounts = (promptText: string, segDuration: string, isUrai = false): { count: number; max: number }[] => {
  const maxWords = isUrai ? (segDuration === '10' ? 35 : 48) : (segDuration === '10' ? 28 : 40);
  const segments = promptText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
  return segments.map(seg => ({ count: countDialogWords(seg), max: maxWords }));
};

const getOnScreenScenes = (appearanceId: string, totalScenes: number): string => {
  switch (appearanceId) {
    case 'adegan-1-saja': return `adegan 1 (semua segmen)`;
    case 'adegan-1-dan-penutup': return `adegan 1 (semua segmen) dan adegan ${totalScenes} dari segmen terakhir`;
    case 'adegan-1-2-dan-penutup': return `adegan 1 & 2 (semua segmen) dan adegan ${totalScenes} dari segmen terakhir`;
    default: return `adegan 1 & 2 (semua segmen)`;
  }
};

const buildCharacterRule = (appearanceId: string, totalScenes: number): string => {
  const onScreen = getOnScreenScenes(appearanceId, totalScenes);
  const sceneList = Array.from({ length: totalScenes }, (_, i) => i + 1);
  const isOnScreen = (sceneNum: number, isLastSegment = false): boolean => {
    switch (appearanceId) {
      case 'adegan-1-saja': return sceneNum === 1;
      case 'adegan-1-dan-penutup': return sceneNum === 1 || (sceneNum === totalScenes && isLastSegment);
      case 'adegan-1-2-dan-penutup': return sceneNum <= 2 || (sceneNum === totalScenes && isLastSegment);
      default: return sceneNum <= 2;
    }
  };
  const offScreenScenes = sceneList.filter(n => !isOnScreen(n));
  const offScreenText = offScreenScenes.length > 0 ? `adegan ${offScreenScenes.join(', ')} (dan semua adegan kecuali penutup segmen terakhir jika berlaku)` : '';
  return `**ATURAN KEMUNCULAN KARAKTER ON-SCREEN — KERAS, TIDAK BOLEH DILANGGAR:**\n\nKarakter HANYA BOLEH TERLIHAT DI LAYAR pada: ${onScreen}.\n\nPada adegan lainnya (${offScreenText}):\n- Karakter TIDAK BOLEH terlihat on-screen dalam bentuk apapun\n- TIDAK bicara ke kamera, TIDAK memegang produk, TIDAK ada gestur, TIDAK ada bagian tubuhnya\n- Visual HARUS 100% fokus pada: objek utama konten, suasana/konteks yang relevan, detail produk/subjek, atau elemen pendukung narasi\n\nPERBEDAAN ON-SCREEN dan VOICE OVER:\n- On-screen = karakter terlihat di video (wajah/tubuh tampak)\n- Voice over = suara narasi yang terdengar di atas visual, TANPA karakter terlihat\n- Adegan tanpa karakter on-screen TETAP BISA memiliki dialog voice over — suaranya terdengar tapi orangnya tidak terlihat\n\nCEK WAJIB sebelum menulis setiap adegan: apakah ini termasuk adegan on-screen karakter?\n→ Jika YA: deskripsikan karakter secara visual (ekspresi, gestur, dll.)\n→ Jika TIDAK: deskripsikan HANYA visual produk/tempat. Karakter tidak boleh disebut secara visual.`;
};

const buildDialogRule = (strategyId: string, appearanceId: string, segmentDuration: string, maxWords: number, totalScenes: number): string => {
  const isOnScreen = (sceneNum: number, isLastSegment = false): boolean => {
    switch (appearanceId) {
      case 'adegan-1-saja': return sceneNum === 1;
      case 'adegan-1-dan-penutup': return sceneNum === 1 || (sceneNum === totalScenes && isLastSegment);
      case 'adegan-1-2-dan-penutup': return sceneNum <= 2 || (sceneNum === totalScenes && isLastSegment);
      default: return sceneNum <= 2;
    }
  };
  if (strategyId === 'voice-over-penuh') {
    const wordsPerScene = Math.floor(maxWords / totalScenes);
    const onScreenWords = Math.round(wordsPerScene * 1.3);
    const voWords = Math.round(wordsPerScene * 0.8);
    return `**ATURAN DIALOG — VOICE OVER PENUH:**\n\nKonsep: dialog berjalan TERUS-MENERUS dari adegan 1 hingga adegan ${totalScenes}. SEMUA adegan WAJIB memiliki dialog.\n\nPOLA DIALOG per adegan dalam 1 segmen (${segmentDuration} detik, maks ${maxWords} kata total):\n${Array.from({ length: totalScenes }, (_, i) => { const n = i + 1; const onScr = isOnScreen(n); const isHook = n === 1; const isCTA = n === totalScenes; const words = onScr ? onScreenWords : voWords; const role = isHook ? 'hook / pembuka' : isCTA ? 'jembatan ke segmen berikutnya atau CTA' : onScr ? 'narasi keunggulan utama' : 'narasi detail visual — pendek, padat'; const type = onScr ? '🎭 on-screen' : '🎙️ voice over'; return `- Adegan ${n} (${type}): ~${words} kata — ${role}`; }).join('\n')}\n\nCEK WAJIB: total kata semua dialog ≤ ${maxWords} kata per segmen.`;
  }
  const onScreenSceneNums = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => isOnScreen(n));
  const offScreenSceneNums = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => !isOnScreen(n));
  const maxWordsOnScreen = Math.round(maxWords / onScreenSceneNums.length * 1.1);
  return `**ATURAN DIALOG — HANYA SAAT KARAKTER ON-SCREEN:**\n\nDialog HANYA ADA di adegan: ${onScreenSceneNums.join(', ')}.\nAdegan ${offScreenSceneNums.join(', ')} WAJIB Dialog: "" (kosong).\nTotal ≤ ${maxWords} kata per segmen, ~${maxWordsOnScreen} kata per adegan on-screen.`;
};

const buildUraiDialogRule = (appearanceId: string, segmentDuration: string, maxWords: number, totalScenes: number): string => {
  const isOnScreen = (sceneNum: number): boolean => { switch (appearanceId) { case 'adegan-1-saja': return sceneNum === 1; case 'adegan-1-dan-penutup': return sceneNum === 1 || sceneNum === totalScenes; case 'adegan-1-2-dan-penutup': return sceneNum <= 2 || sceneNum === totalScenes; default: return sceneNum <= 2; } };
  const wordsPerScene = Math.floor(maxWords / totalScenes);
  const onScreenWords = Math.round(wordsPerScene * 1.2);
  const voWords = Math.round(wordsPerScene * 0.85);
  return `**ATURAN DISTRIBUSI DIALOG DARI SKRIP — MODE URAI:**\n\nJANGAN UBAH kata-kata dari skrip. Potong HANYA di jeda natural.\n\nPOLA per adegan (${segmentDuration} detik, ~${totalScenes} adegan, maks ${maxWords} kata):\n${Array.from({ length: totalScenes }, (_, i) => { const n = i + 1; const onScr = isOnScreen(n); const words = onScr ? onScreenWords : voWords; const type = onScr ? '🎭 on-screen' : '🎙️ voice over'; const role = n === 1 ? 'pembuka/hook' : n === totalScenes ? 'penutup/CTA' : 'narasi lanjutan'; return `- Adegan ${n} (${type}): ~${words} kata — ${role}`; }).join('\n')}\n\nCEK WAJIB: total kata dialog per segmen ≤ ${maxWords} kata.`;
};

const buildStyleGuide = (styleIds: string[]): string => {
  const allGuides: Record<string, string> = {
    'ugc': `**[UGC] User Generated Content:**\nNADA: Jujur, spontan, seperti orang biasa yang beneran nyobain — bukan influencer berbayar.\nHOOK WAJIB: Pembuka terasa pengakuan jujur + info lokasi hemat.\nSTRUKTUR: Hook jujur → cerita pengalaman → detail menarik → manfaat spesifik → CTA natural.\nCIRI KHAS: Filler natural (eh, loh, beneran deh), bahasa informal, cerita personal.`,
    'storytelling': `**[Storytelling]:**\nNADA: Emosional, membangun rasa penasaran, ada konflik kecil dan resolusi memuaskan.\nHOOK WAJIB: Buka dengan situasi relatable, info hemat muncul sebagai "temuan penting".\nSTRUKTUR: Hook situasi → konflik/kebutuhan → pertemuan produk → momen "wow" → resolusi → CTA.\nCIRI KHAS: Kalimat membangun antisipasi ("dan ternyata…", "yang bikin aku kaget…").`,
    'soft-selling': `**[Soft Selling]:**\nNADA: Edukatif, informatif — terasa berbagi pengetahuan, bukan menjual.\nHOOK WAJIB: Buka dengan fakta/insight menarik tentang sistem harga.\nSTRUKTUR: Hook fakta → edukasi manfaat → perbandingan/konteks → tips → CTA logis.\nCIRI KHAS: "faktanya…", "yang bikin ini beda…", "banyak yang belum tau…".`,
    'problem-solution': `**[Problem–Solution]:**\nNADA: Empati dulu — "iya bener banget!" — lalu solusi yang tegas.\nHOOK WAJIB: Masalah relatable, info hemat sebagai solusi langsung.\nSTRUKTUR: Hook masalah → perburukan masalah → solusi konkret → bukti → resolusi → CTA.\nCIRI KHAS: "pernah nggak kamu…?", "capek nggak sih kalau…", "tapi sekarang…".`,
    'cinematic': `**[Cinematic]:**\nNADA: Tenang, premium, minimal tapi berdampak — aspirasional dan elegan.\nHOOK WAJIB: Kalimat sangat pendek dan puitis, info hemat elegan/eksklusif.\nSTRUKTUR: Opening kuat (info hemat, elegan) → keistimewaan produk puitis → detail sensorik → CTA elegan.\nCIRI KHAS: Kalimat 5–8 kata per kalimat, puitis, biarkan visual berbicara.`,
    'listicle': `**[Listicle]:**\nNADA: Jelas, terstruktur, to-the-point.\nHOOK WAJIB: Janji konten yang jelas + info hemat sebagai poin pertama.\nSTRUKTUR: Hook "ada N hal" (poin 1 = info hemat) → poin 2 → poin 3 (favorit) → CTA logis.\nCIRI KHAS: "pertama…", "kedua…", "yang ketiga dan paling bikin balik lagi…".`,
  };
  return [...new Set(styleIds)].map(id => allGuides[id] ?? allGuides['ugc']).join('\n\n');
};

const INDONESIAN_CONTEXT_RULE = `**ATURAN KONTEKS VISUAL INDONESIA — WAJIB DITERAPKAN DI SEMUA ADEGAN:**\nUANG: "uang kertas Rupiah Indonesia", "lembaran Rupiah merah pecahan 100 ribu" — JANGAN hanya "uang".\nFIGURAN: tambahkan "pengunjung berkulit sawo matang, orang Indonesia" — JANGAN ubah karakter utama.`;

// ── Tipe ──────────────────────────────────────────────────────────────────
type PromptModeKey = 'bebas' | 'rapi' | 'urai' | 'skrip-jualan';

// ── Modal ganti password ──────────────────────────────────────────────────
function ChangePwModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [cur,  setCur]  = useState('');
  const [next, setNext] = useState('');
  const [msg,  setMsg]  = useState('');
  const [ok,   setOk]   = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!cur || !next) return;
    setBusy(true); setMsg('');
    const res  = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'change-password', currentPassword: cur, newPassword: next }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setOk(true); setMsg('✅ Password berhasil diubah!'); setTimeout(onClose, 1500); }
    else setMsg(`❌ ${data.error}`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-gray-800 border border-purple-700/60 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-base font-bold text-zinc-200">🔒 Ganti Password</h2><button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">✕</button></div>
        {['Password Lama', 'Password Baru'].map((label, i) => (
          <div key={label} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">{label}</label>
            <input type="password" value={i === 0 ? cur : next} onChange={e => i === 0 ? setCur(e.target.value) : setNext(e.target.value)} placeholder={i === 0 ? 'Password saat ini' : 'Min. 6 karakter'} className="bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        ))}
        {msg && <p className={`text-xs rounded-lg px-3 py-2 ${ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>{msg}</p>}
        <button onClick={submit} disabled={busy || !cur || !next} className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-yellow-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
          {busy ? 'Menyimpan...' : 'Simpan Password'}
        </button>
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// App
// ═════════════════════════════════════════════════════════════════════════
export default function App() {
  const { user, token, isLoading: authLoading, loginError, login, logout, updateCredits, upgradeRole } = useAuth();

  // ── Modal states ──────────────────────────────────────────────────────
  const [showBuyModal,    setShowBuyModal]    = useState(false);
  const [showChangePw,    setShowChangePw]    = useState(false);
  const [showAdminPanel,  setShowAdminPanel]  = useState(false);

  // ── Free user: API key (tersimpan di localStorage) ───────────────────
  const [freeApiKey, setFreeApiKey] = useState<string>(() => {
    try { return localStorage.getItem(FREE_API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showFreeKey,     setShowFreeKey]     = useState(false);
  const [savedFreeKey,    setSavedFreeKey]    = useState(false);

  const saveFreeApiKey = (key: string) => {
    setFreeApiKey(key);
    try { if (key) localStorage.setItem(FREE_API_KEY_STORAGE, key); else localStorage.removeItem(FREE_API_KEY_STORAGE); } catch {}
  };

  // ── Per-mode prompt storage ───────────────────────────────────────────
  const [promptsByMode,   setPromptsByMode]   = useState<Record<string, string[]>>({});
  const [warningsByMode,  setWarningsByMode]  = useState<Record<string, string[][]>>({});
  const [visualRefsByMode,setVisualRefsByMode]= useState<Record<string, string[]>>({});

  const [isLoading,     setIsLoading]     = useState(false);
  const [activeStyles,  setActiveStyles]  = useState<string[]>(['ugc']);
  const [copiedIndex,   setCopiedIndex]   = useState<number | null>(null);
  const [copiedSegmentKey, setCopiedSegmentKey] = useState<string | null>(null);
  const [copiedLanjutan,   setCopiedLanjutan]   = useState(false);

  const [category,         setCategory]         = useState('Makanan/Minuman');
  const [nameDesc,         setNameDesc]         = useState('');
  const [character,        setCharacter]        = useState('');
  const [segmentDuration,  setSegmentDuration]  = useState('15');
  const [totalDuration,    setTotalDuration]    = useState('45');
  const [contentCount,     setContentCount]     = useState('1');
  const [promptMode,       setPromptMode]       = useState<PromptModeKey>('bebas');
  const [loadingText,      setLoadingText]      = useState('Menganalisa & membuat prompt...');
  const [generateError,    setGenerateError]    = useState('');

  const [characterAppearance, setCharacterAppearance] = useState('adegan-1-2');
  const [dialogStrategy,      setDialogStrategy]      = useState('voice-over-penuh');
  const [scriptInput,         setScriptInput]         = useState('');

  const prompts       = promptsByMode[promptMode]  ?? [];
  const promptWarnings= warningsByMode[promptMode] ?? [];
  const visualRefs    = visualRefsByMode[promptMode]?? [];

  const [skripJualanOutput,    setSkripJualanOutput]    = useState('');
  const [isSkripJualanLoading, setIsSkripJualanLoading] = useState(false);
  const [skripJualanLoadingText, setSkripJualanLoadingText] = useState('Membuat skrip...');

  // ── Auth gate ─────────────────────────────────────────────────────────
 // SESUDAH
if (authLoading) return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-purple-500 border-t-yellow-400 rounded-full animate-spin" />
  </div>
);
if (!user) return <LoginScreen onLogin={login} isLoading={authLoading} error={loginError} />;

  const isPro   = user.role === 'pro' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Cek apakah mode ini boleh dipakai
  const modeAllowed = (mode: PromptModeKey): boolean => {
    if (isPro) return true;
    return mode === 'bebas'; // free hanya boleh bebas
  };

  // Loading messages
  const loadingMessages     = ['Mencari ide-ide sinematik...', 'Meracik hook yang menarik...', 'Mengembangkan detail visual...', 'Menyusun narasi yang kuat...', 'Finalisasi prompt video...'];
  const uraiLoadingMessages = ['Membaca skrip...', 'Menentukan jumlah segmen...', 'Membagi dialog ke setiap adegan...', 'Merancang visual per adegan...', 'Finalisasi prompt Sora...'];
  const skripLoadingMessages= ['Memilih hook yang tepat...', 'Menyusun rumus storytelling...', 'Merangkai narasi produk...', 'Menulis caption & hashtag...', 'Finalisasi skrip...'];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      const messages = promptMode === 'urai' ? uraiLoadingMessages : loadingMessages;
      let i = 0; setLoadingText(messages[0]);
      interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingText(messages[i]); }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading, promptMode]);

  const toggleStyle = (styleId: string) => {
    setActiveStyles(prev => {
      if (prev.includes(styleId)) return prev.length > 1 ? prev.filter(s => s !== styleId) : prev;
      return [...prev, styleId];
    });
  };

  const downloadPrompts = () => {
    const visualDetail = visualRefs[0] || nameDesc || '[PRODUK/TEMPAT]';
    const lanjutanSection = promptMode === 'bebas' && prompts.length > 0
      ? `\n\n---\n\n▶ SEGMEN LANJUTAN (Extend Sora)\nLanjutkan video sebelumnya secara natural kurang dari ${segmentDuration} detik. Akhir Dialog: "klik tag lokasi bawah untuk detailnya ya." MULTI SCENE. NO TEXT. NO MUSIC. No cut-off dialogue. CLEAR SUBJECT LOCK. ANTI BLUR. Semua visual HANYA menampilkan ${visualDetail}.`
      : '';
    const content = prompts.join('\n\n---\n\n') + lanjutanSection;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'sora-prompts.txt';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handlePromptChange = (newText: string, index: number) => {
    const updated = [...prompts]; updated[index] = newText;
    setPromptsByMode(prev => ({ ...prev, [promptMode]: updated }));
    if (promptMode === 'rapi' || promptMode === 'urai' || promptMode === 'bebas') {
      const updatedWarnings = [...promptWarnings];
      updatedWarnings[index] = validateDialogLength(newText, segmentDuration, promptMode === 'urai');
      setWarningsByMode(prev => ({ ...prev, [promptMode]: updatedWarnings }));
    }
  };

  const copyPrompt = (text: string, index: number) => {
    const start = text.indexOf('▶ SEGMEN');
    navigator.clipboard.writeText(start !== -1 ? text.substring(start) : text);
    setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copySegment = (fullText: string, promptIndex: number, segmentIndex: number) => {
    const segments = fullText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
    const target   = segments[segmentIndex];
    if (target) {
      navigator.clipboard.writeText(target.trim().replace(/^▶ SEGMEN[^\n]*\n/, '').trim());
      const key = `${promptIndex}-${segmentIndex}`;
      setCopiedSegmentKey(key); setTimeout(() => setCopiedSegmentKey(null), 2000);
    }
  };

  const extractSegments = (text: string): string[] => text.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));

  const getScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 7;
    const isOnScreen  = (n: number): boolean => { switch (characterAppearance) { case 'adegan-1-saja': return n === 1; case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes; case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes; default: return n <= 2; } };
    return Array.from({ length: totalScenes }, (_, i) => { const n = i + 1; const onScreen = isOnScreen(n); return { n, onScreen, hasDialog: dialogStrategy === 'voice-over-penuh' ? true : onScreen }; });
  };

  const getUraiScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 8;
    const isOnScreen  = (n: number): boolean => { switch (characterAppearance) { case 'adegan-1-saja': return n === 1; case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes; case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes; default: return n <= 2; } };
    return Array.from({ length: totalScenes }, (_, i) => { const n = i + 1; return { n, onScreen: isOnScreen(n), hasDialog: true }; });
  };

  // ── Panggil API dengan auth header ────────────────────────────────────
  const callGemini = async (body: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const res  = await fetch('/api/gemini', { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Terjadi kesalahan');
    return data;
  };

  // ── Handler Skrip Jualan ─────────────────────────────────────────────
  const handleSkripJualanGenerate = async (config: SkripJualanConfig) => {
    setIsSkripJualanLoading(true); setSkripJualanOutput(''); setGenerateError('');
    let i = 0; setSkripJualanLoadingText(skripLoadingMessages[0]);
    const interval = setInterval(() => { i = (i + 1) % skripLoadingMessages.length; setSkripJualanLoadingText(skripLoadingMessages[i]); }, 1500);
    try {
      const creditCost = config.jumlahSkrip;
      const data = await callGemini({
        userPrompt:        buildSkripJualanUserPrompt(config),
        systemInstruction: buildSkripJualanSystemPrompt(config),
        temperature:       0.8,
        useSearch:         false,
        creditCost,
        ...(isPro ? {} : { userApiKey: freeApiKey }),
      });
      setSkripJualanOutput(data.text || '');
      if (data.credits !== undefined) updateCredits(data.credits);
    } catch (e: any) {
      if (e.message?.includes('402') || e.message?.includes('Kredit')) setGenerateError(e.message);
      setSkripJualanOutput(`❌ ${e.message}`);
    } finally {
      clearInterval(interval); setIsSkripJualanLoading(false);
    }
  };

  // ── Handler Generate Prompt ───────────────────────────────────────────
  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerateError('');
    setPromptsByMode(prev => ({ ...prev, [promptMode]: [] }));
    setWarningsByMode(prev => ({ ...prev, [promptMode]: [] }));

    const getStyleTitle = (id: string) => contentStyles.find(s => s.id === id)?.title || id;
    const count = parseInt(contentCount) || 1;
    const styleDistribution = Array.from({ length: count }, (_, i) => activeStyles[i % activeStyles.length]);
    const stylePerContent = styleDistribution.map((s, i) => `Konten ${i + 1}: ${getStyleTitle(s)}`).join('\n');

    const isUraiMode  = promptMode === 'urai';
    const totalScenes = isUraiMode ? (segmentDuration === '10' ? 5 : 8) : (segmentDuration === '10' ? 5 : 7);
    const maxWords    = isUraiMode ? (segmentDuration === '10' ? 35 : 48) : (segmentDuration === '10' ? 28 : 40);

    const creditCost = calcCreditCost(promptMode, totalDuration, segmentDuration, contentCount, scriptInput);

    // Build system instruction (identik dengan versi asli — diringkas untuk brevity, lihat komentar di bawah)
    const characterRule   = buildCharacterRule(characterAppearance, totalScenes);
    const dialogRule      = buildDialogRule(dialogStrategy, characterAppearance, segmentDuration, maxWords, totalScenes);
    const activeStyleGuide= buildStyleGuide(activeStyles);

    // System instruction dan user prompt (sama dengan versi asli App.tsx versi 2)
    // Lihat file App_original.tsx untuk isi lengkap jika diperlukan
    const bebasModeInstruction = `Kamu adalah AI pembuat Sora Video Prompt Mamas dalam Bahasa Indonesia yang dibekali kemampuan pencarian Google. Tugas utamamu adalah MENCARI INFORMASI tentang input user, lalu membuat prompt video yang SANGAT SPESIFIK, deskriptif, dan sinematik.\n\n**PROSES BERPIKIR:**\n1. Gunakan Google Search untuk riset.\n2. Kembangkan deskripsi dari hasil riset.\n3. Identifikasi manfaat/use-case.\n4. Tulis seluruh dialog sebagai paragraf mengalir. WAJIB diawali "iya nih ............, iya nih ............, "\n5. Konstruksi prompt dari dialog tersebut.\n\n**FORMAT:** Awali tiap segmen dengan '▶ SEGMEN [N] ([X] detik)'. Pisah segmen dengan '--'. Pisah konten dengan '*****'. Sebelum ▶ SEGMEN 1 tiap konten, tulis 'VISUAL_REF: [deskripsi visual spesifik]'.\n\n**BANK HOOK SEGMEN 1:**\n===MAKANAN/RESTO===\n-"Serius deh ini, kalau kamu klik lokasi di bawah, harganya beda. Lebih hemat dibanding beli langsung."\n-"Jujur ya ini, Yang datang langsung bayar lebih. Klik lokasi bawah aja. Sistemnya memang begitu."\n-"Beneran deh ini, Langsung klik lokasi bawah. Harganya lebih bersahabat dibanding pesan langsung di kasir."\n===HOTEL===\n-"Ini asli sih, Booking lewat lokasi bawah itu harganya lebih rendah daripada walk-in."\n-"Ini beneran ya, Yang check-in langsung biasanya bayar lebih. Klik lokasi bawah."\n===TEMPAT WISATA===\n-"Ini asli sih, Tiket lewat lokasi bawah itu lebih murah dibanding beli langsung di loket."\n-"Ini beneran ya, Jangan beli on the spot. Klik lokasi bawah."\n\nAWALI setiap dialog di tiap segmen dengan "iya nih ............, iya nih ............, ".\nDILARANG menampilkan layar HP atau UI aplikasi order apapun.\nOutput: paragraf naratif menyatu, BUKAN list.`;

    const rapiModeInstruction = `Kamu adalah AI Scriptwriter dan Visual Director TikTok dalam Bahasa Indonesia, DIBEKALI GOOGLE SEARCH.\n\n**ALUR KERJA:**\n1. RISET via Google Search.\n2. Tulis skrip penuh mengalir sesuai durasi target.\n3. Bagi ke segmen & adegan.\n4. Output langsung dengan ▶ SEGMEN 1.\n\n**PANDUAN GAYA:**\n${activeStyleGuide}\n\n${dialogRule}\n\n${characterRule}\n\n**FORMAT OUTPUT:**\n▶ SEGMEN [N] ([X] detik)\nBuatkan video realistic ${character || 'faceless'} review ${nameDesc}, Durasi [X] detik, MULTI SCENE, NO TEXT, CLEAR SUBJECT LOCK, ANTI BLUR. REAL VIDEO ONLY.\n\nDeskripsi visual adegan 1, Dialog: "kalimat 1"\nDeskripsi visual adegan 2, Dialog: "kalimat 2"\n[dst...]\n\n${INDONESIAN_CONTEXT_RULE}\n\nAWALI tiap segmen '▶ SEGMEN [N]'. Pisah dengan '--'. Konten dengan '*****'. DILARANG layar HP/UI aplikasi. DILARANG kata "Karakter" sebelum nama karakter.`;

    const uraiDialogRule = buildUraiDialogRule(characterAppearance, segmentDuration, maxWords, totalScenes);
    const uraiVisualGuide = category === 'Makanan/Minuman' ? 'Prioritaskan: wide shot suasana outlet, medium shot hidangan dengan latar terlihat, medium shot proses penyajian.' : category === 'Hotel' ? 'Prioritaskan: wide shot interior kamar, medium shot fasilitas, wide shot eksterior.' : category === 'Tempat Wisata' ? 'Prioritaskan: wide shot panorama, medium shot spot ikonik, wide shot area berbeda.' : category === 'Produk Jualan' ? 'Prioritaskan: wide shot produk dalam konteks penggunaan, medium shot detail, close-up tekstur.' : 'Prioritaskan: wide shot suasana relevan, medium shot elemen utama, close-up detail.';

    const uraiModeInstruction = `Kamu adalah AI Visual Director TikTok. Urai skrip menjadi prompt Sora yang siap produksi. JANGAN tambah/ubah kata dari skrip.\n\n${uraiDialogRule}\n\n${characterRule}\n\n**FORMAT:**\n▶ SEGMEN [N] ([X] detik)\nBuatkan video realistic ${character || 'faceless'} ${category === 'Produk Jualan' ? 'mempromosikan' : category === 'Konten Umum/Bebas' ? 'membawakan konten tentang' : 'mereview'} ${nameDesc || 'sesuai gambar'}, REAL VIDEO ONLY.\n\nDeskripsi adegan 1, Dialog: "penggalan skrip"\nDeskripsi adegan 2, Dialog: "penggalan skrip"\n[dst...]\n\n--\n\n${INDONESIAN_CONTEXT_RULE}\n\nAwali '▶ SEGMEN [N]'. Pisah '--'. DILARANG ubah kata skrip. DILARANG layar HP/UI aplikasi.\n\nPanduan visual: ${uraiVisualGuide}`;

    const systemInstruction = promptMode === 'bebas' ? bebasModeInstruction : promptMode === 'rapi' ? rapiModeInstruction : uraiModeInstruction;

    const userPrompt = promptMode === 'urai'
      ? `Urai skrip berikut:\n\nKategori: ${category}\nNama & Deskripsi: ${nameDesc || '-'}\nKarakter: ${character || 'faceless'}\nDurasi per Segmen: ${segmentDuration} detik\nAdegan per Segmen: ${totalScenes}\n\nSKRIP:\n"""\n${scriptInput}\n"""\n\nTentukan jumlah segmen dari panjang skrip, lalu buat prompt Sora-nya.`
      : `Buatkan ${contentCount} konten video:\n\nKategori: ${category}\nNama & Deskripsi: ${nameDesc}\nKarakter: ${character || 'faceless'}\nDurasi per Segmen: ${segmentDuration} detik\nTotal Durasi: ${totalDuration} detik\n\nGaya Konten:\n${stylePerContent}`;

    try {
      const data = await callGemini({
        userPrompt,
        systemInstruction,
        temperature: promptMode === 'urai' ? 0.65 : 0.8,
        useSearch:   promptMode !== 'urai',
        creditCost,
        ...(isPro ? {} : { userApiKey: freeApiKey }),
      });

      if (data.credits !== undefined) updateCredits(data.credits);

      const responseText = (data.text || '')
        .replace(/\*\*\*\*\*/g, '|||CONTENT_BREAK|||')
        .replace(/^\-\-\-$/gm, '--')
        .replace(/^\[([^\]]+)\],/gm, '$1,')
        .replace(/^\[([^\]]+)\]$/gm, '$1');

      const generatedPrompts = responseText.split('|||CONTENT_BREAK|||').map((p: string) => p.trim()).filter((p: string) => p.includes('▶ SEGMEN'));

      const formattedPrompts = generatedPrompts.map((prompt: string, i: number) => {
        const styleId     = styleDistribution[i] ?? activeStyles[0];
        const styleTitle  = getStyleTitle(styleId);
        const totalSegs   = (prompt.match(/▶ SEGMEN/g) || []).length;
        const label       = promptMode === 'urai' ? 'URAI SKRIP' : styleTitle.toUpperCase();
        return `═══════════════════════════════════════\nKONTEN #${i + 1} — ${label}\n═══════════════════════════════════════\nKategori: ${category}\n${promptMode === 'urai' ? `Durasi per Segmen: ${segmentDuration} detik (${totalSegs} segmen Sora)` : `Durasi Target: ${totalDuration} detik (${totalSegs} segmen Sora)`}\n\n${prompt}`;
      });

      setPromptsByMode(prev => ({ ...prev, [promptMode]: formattedPrompts }));

      const refs = formattedPrompts.map((p: string) => { const match = p.match(/VISUAL_REF:\s*([^\n]+)/); return match ? match[1].trim() : nameDesc; });
      setVisualRefsByMode(prev => ({ ...prev, [promptMode]: refs }));

      if (promptMode === 'rapi' || promptMode === 'urai') {
        const warnings = formattedPrompts.map((p: string) => validateDialogLength(p, segmentDuration, promptMode === 'urai'));
        setWarningsByMode(prev => ({ ...prev, [promptMode]: warnings }));
      }
    } catch (error: any) {
      const msg = error?.message ?? 'Terjadi kesalahan';
      setGenerateError(msg);
      setPromptsByMode(prev => ({ ...prev, [promptMode]: [`❌ ${msg}`] }));
    } finally {
      setIsLoading(false);
    }
  };

  const scenePreview    = promptMode === 'urai' ? getUraiScenePreview() : getScenePreview();
  const estimatedCost   = calcCreditCost(promptMode, totalDuration, segmentDuration, contentCount, scriptInput);
  const hasEnoughCredit = isPro ? user.credits >= estimatedCost : true;
  const canGenerate     = !isLoading && (isPro ? hasEnoughCredit : !!freeApiKey.trim()) && (promptMode !== 'urai' || !!scriptInput.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-zinc-200 font-sans p-4 sm:p-6 lg:p-8">

      {/* ── Modals ── */}
      {showBuyModal    && <BuyCreditsModal token={token!} currentCredits={user.credits} onClose={() => setShowBuyModal(false)} onSuccess={credits => { updateCredits(credits); upgradeRole('pro'); setShowBuyModal(false); }} />}
      {showChangePw    && <ChangePwModal   token={token!} onClose={() => setShowChangePw(false)} />}
      {showAdminPanel  && <AdminPanel      token={token!} onClose={() => setShowAdminPanel(false)} />}

      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500">
                ScriptMate & SoraPrompt
              </h1>
              <p className="text-sm text-purple-300 mt-1">AI Generator Skrip & Prompt Video Sora · TikTok GO + Affiliate</p>
            </div>
            <CreditDisplay
              user={user}
              onBuyCredits={() => setShowBuyModal(true)}
              onChangePw={()   => setShowChangePw(true)}
              onAdminPanel={isAdmin ? () => setShowAdminPanel(true) : undefined}
              onLogout={logout}
            />
          </div>
        </header>

        {/* ── FREE: API Key Panel ── */}
        {!isPro && (
          <div className="mb-8 p-5 bg-gray-800/60 border border-yellow-700/60 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-base font-bold text-yellow-400">API Key Gemini (Mode Free)</h3>
                {freeApiKey && <span className="text-xs bg-green-900/50 border border-green-600/60 text-green-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Aktif</span>}
              </div>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-300 font-semibold">Mode Free: hanya Mode Bebas yang aktif. Upgrade ke Pro untuk akses semua mode.</p>
              <p className="text-xs text-zinc-400 mt-1">Dapatkan API Key gratis di <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-yellow-400 underline">Google AI Studio →</a></p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showFreeKey ? 'text' : 'password'} value={freeApiKey} onChange={e => setFreeApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && (saveFreeApiKey(freeApiKey), setSavedFreeKey(true), setTimeout(() => setSavedFreeKey(false), 2000))} placeholder="Masukkan Gemini API Key..." className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono" />
                <button onClick={() => setShowFreeKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs">{showFreeKey ? '🙈' : '👁️'}</button>
              </div>
              <button onClick={() => { saveFreeApiKey(freeApiKey); setSavedFreeKey(true); setTimeout(() => setSavedFreeKey(false), 2000); }} disabled={!freeApiKey.trim()} className="px-4 py-2.5 bg-yellow-500 text-gray-900 font-bold text-sm rounded-lg hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">{savedFreeKey ? '✓ Tersimpan!' : 'Simpan'}</button>
              {freeApiKey && <button onClick={() => saveFreeApiKey('')} className="px-3 py-2.5 bg-red-900/40 text-red-400 border border-red-700/50 font-semibold text-sm rounded-lg hover:bg-red-900/60">Hapus</button>}
            </div>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* ── MODE SKRIP JUALAN ── */}
          {promptMode === 'skrip-jualan' ? (
            <>
              <div className="flex flex-col gap-8">
                {/* Mode Selector */}
                <ModeSelector promptMode={promptMode} setPromptMode={setPromptMode} modeAllowed={modeAllowed} />
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">🛒 Cara Kerja Mode Ini</p>
                  <p className="text-xs text-zinc-400">Isi form → AI membuat skrip jualan lengkap dengan hook, narasi produk, CTA, caption, dan hashtag.</p>
                </div>
                <SkripJualanForm onGenerate={handleSkripJualanGenerate} isLoading={isSkripJualanLoading} />
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col gap-8">
                <div className="border-b border-purple-700 pb-3"><h2 className="text-2xl font-semibold text-yellow-400">🛒 Hasil Skrip Jualan</h2></div>
                <SkripJualanOutput rawOutput={skripJualanOutput} isLoading={isSkripJualanLoading} loadingText={skripJualanLoadingText} />
              </motion.div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-8">

                {/* Mode Prompt */}
                <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">⚙️ Mode Prompt</h2>
                  <ModeSelector promptMode={promptMode} setPromptMode={setPromptMode} modeAllowed={modeAllowed} />

                  {promptMode === 'bebas' && (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-yellow-400 mb-1">🚀 Cara Kerja Mode Ini</p>
                      <p className="text-xs text-zinc-400">Isi form → AI riset produk lewat Google lalu buat prompt video sinematik gaya TikTok GO. Output berbentuk paragraf naratif siap pakai di Sora.</p>
                    </div>
                  )}

                  {promptMode === 'rapi' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6 mt-2 pt-4 border-t border-purple-800">
                      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-yellow-400 mb-1">🎬 Cara Kerja Mode Ini</p>
                        <p className="text-xs text-zinc-400">AI riset lewat Google, tulis skrip penuh, bagi ke segmen & adegan dengan format visual rapi.</p>
                      </div>
                      <AppearanceSelector value={characterAppearance} onChange={setCharacterAppearance} />
                      <DialogSelector value={dialogStrategy} onChange={setDialogStrategy} />
                      <ScenePreviewBox scenePreview={scenePreview} segmentDuration={segmentDuration} mode="rapi" />
                    </motion.div>
                  )}

                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6 mt-2 pt-4 border-t border-purple-800">
                      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-yellow-400 mb-1">✂️ Cara Kerja Mode Ini</p>
                        <p className="text-xs text-zinc-400">Berikan skripmu → AI jadi sutradara: menentukan segmen, bagi dialog per adegan (~2 detik), rancang visual sinematik.</p>
                      </div>
                      <AppearanceSelector value={characterAppearance} onChange={setCharacterAppearance} />
                      <ScenePreviewBox scenePreview={scenePreview} segmentDuration={segmentDuration} mode="urai" />
                    </motion.div>
                  )}
                </div>

                {/* Input User */}
                <div className="flex flex-col gap-6 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">📥 Input User</h2>
                  <Select label="Kategori" id="category" value={category} onChange={e => setCategory(e.target.value)}>
                    <option>Makanan/Minuman</option><option>Hotel</option><option>Tempat Wisata</option><option>Produk Jualan</option><option>Konten Umum/Bebas</option>
                  </Select>
                  <Textarea label={promptMode === 'urai' ? 'Nama & Deskripsi (opsional)' : 'Nama & Deskripsi Singkat'} id="nameDesc" value={nameDesc} onChange={e => setNameDesc(e.target.value)} placeholder={promptMode === 'urai' ? 'Opsional — nama produk, topik konten, atau kosongkan' : 'Contoh: Roti Gembul - roti lembut isi selai coklat lumer...'} />
                  <Input label="Karakter (kosongkan = faceless)" id="character" value={character} onChange={e => setCharacter(e.target.value)} placeholder="Contoh: Pria review makanan, gaya santai" />

                  {promptMode !== 'urai' ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={e => setSegmentDuration(e.target.value)}><option value="10">10 detik</option><option value="15">15 detik</option></Select>
                      <Input label="Total Durasi (detik)" id="totalDuration" type="number" step="5" value={totalDuration} onChange={e => setTotalDuration(e.target.value)} placeholder="Contoh: 45" />
                      <Input label="Jumlah Konten" id="contentCount" type="number" min="1" value={contentCount} onChange={e => setContentCount(e.target.value)} placeholder="1" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={e => setSegmentDuration(e.target.value)}><option value="10">10 detik</option><option value="15">15 detik</option></Select>
                      <div className="flex flex-col gap-1"><label className="text-xs font-medium text-zinc-400">Adegan per Segmen</label><div className="flex items-center h-10 px-3 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-zinc-400">{segmentDuration === '10' ? '5 adegan' : '8 adegan'} (~2 dtk/adegan)</div></div>
                    </div>
                  )}

                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <label htmlFor="scriptInput" className="text-sm font-semibold text-yellow-400 flex items-center gap-2">✍️ Skrip / Narasi <span className="text-xs font-normal text-zinc-500">(dijadikan dialog VO — tidak diubah)</span></label>
                      <textarea id="scriptInput" value={scriptInput} onChange={e => setScriptInput(e.target.value)} placeholder={`Tulis atau tempel skripmu di sini...`} rows={8} className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y" />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-zinc-600">AI otomatis menentukan jumlah segmen.</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${scriptInput.trim().split(/\s+/).filter(Boolean).length > 0 ? 'bg-green-900/30 border-green-700/60 text-green-400' : 'bg-gray-800 border-gray-700 text-zinc-600'}`}>{scriptInput.trim().split(/\s+/).filter(Boolean).length} kata</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Gaya Konten */}
                {promptMode !== 'urai' && (
                  <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                    <div className="flex items-center justify-between border-b border-purple-700 pb-3">
                      <h2 className="text-2xl font-semibold text-yellow-400">🎨 Gaya Konten</h2>
                      <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">{activeStyles.length} terpilih</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contentStyles.map(style => (<StyleButton key={style.id} number={style.number} title={style.title} description={style.description} isActive={activeStyles.includes(style.id)} onClick={() => toggleStyle(style.id)} />))}
                    </div>
                  </div>
                )}

                {/* Credit cost preview */}
                {isPro && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${hasEnoughCredit ? 'bg-purple-900/20 border-purple-700/50 text-purple-300' : 'bg-red-900/20 border-red-700/50 text-red-300'}`}>
                    <span>💎 Estimasi biaya: <strong>{estimatedCost} kredit</strong></span>
                    <span className="text-xs">Sisa: {user.credits} kredit</span>
                  </div>
                )}

                {/* Error */}
                {generateError && (
                  <div className="bg-red-900/30 border border-red-600/50 text-red-300 text-xs rounded-lg px-4 py-3 flex items-start gap-2">
                    <span>❌</span>
                    <span>{generateError} {!isPro && generateError.includes('Kredit') ? '' : ''}{generateError.includes('Kredit') && <button onClick={() => setShowBuyModal(true)} className="ml-2 underline text-yellow-400 font-semibold">Top Up Kredit →</button>}</span>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={!canGenerate}
                  className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-4 rounded-lg text-lg hover:from-yellow-400 hover:to-purple-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                  {isLoading ? 'Menghasilkan...' : promptMode === 'urai' ? '✂️ Urai Skrip Jadi Prompt' : '✨ Hasilkan Prompt'}
                </button>
                {!canGenerate && !isLoading && (
                  <p className="text-xs text-center text-zinc-500 -mt-4">
                    {isPro && !hasEnoughCredit ? '💎 Kredit tidak cukup — ' : !isPro && !freeApiKey ? '🔑 Masukkan Gemini API Key di atas — ' : promptMode === 'urai' && !scriptInput.trim() ? 'Isi skrip terlebih dahulu' : ''}
                    {isPro && !hasEnoughCredit ? <button onClick={() => setShowBuyModal(true)} className="text-yellow-400 underline font-semibold">Top Up Kredit →</button> : null}
                  </p>
                )}
              </div>

              {/* ── Output Section ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col gap-8">
                <div className="flex justify-between items-center border-b border-purple-700 pb-3">
                  <h2 className="text-2xl font-semibold text-yellow-400">🚀 Hasil Prompt</h2>
                  {prompts.length > 0 && (
                    <button onClick={downloadPrompts} className="flex items-center gap-2 text-sm bg-purple-700 text-zinc-300 px-3 py-1.5 rounded-md hover:bg-purple-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download All
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-800/50 border border-purple-700 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {[0, 0.2, 0.4].map((d, i) => <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: `${d}s` }} />)}
                      </div>
                      <p className="text-zinc-400 text-center">{loadingText}</p>
                    </div>
                  )}
                  {!isLoading && prompts.length === 0 && (
                    <div className="flex items-center justify-center h-64 bg-gray-800/50 border border-dashed border-purple-600 rounded-xl">
                      <p className="text-purple-400 text-center">Hasil prompt akan muncul di sini.</p>
                    </div>
                  )}

                  {prompts.map((prompt, index) => {
                    const segments    = extractSegments(prompt);
                    const showWordCnt = promptMode === 'rapi' || promptMode === 'urai';
                    const wordCounts  = showWordCnt ? getSegmentWordCounts(prompt, segmentDuration, promptMode === 'urai') : [];
                    const hasWarning  = (promptWarnings[index]?.length ?? 0) > 0;

                    return (
                      <div key={index} className="flex flex-col gap-3">
                        <div className="relative group">
                          <Textarea id={`prompt-${index}`} value={prompt} onChange={e => handlePromptChange(e.target.value, index)} className="h-48" />
                          <button onClick={() => copyPrompt(prompt, index)} className="absolute top-3 right-3 bg-purple-700/80 text-white px-3 py-1.5 rounded-md text-xs hover:bg-purple-600 font-semibold">
                            {copiedIndex === index ? '✓ Tersalin!' : 'Salin Semua'}
                          </button>
                        </div>

                        {showWordCnt && wordCounts.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-1">
                            {wordCounts.map((wc, wi) => {
                              const isOver = wc.count > wc.max;
                              return (<span key={wi} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isOver ? 'bg-red-900/40 border-red-600 text-red-300' : 'bg-green-900/30 border-green-700/60 text-green-300'}`}>{isOver ? '⚠️' : '✓'} Seg {wi + 1}: {wc.count}/{wc.max} kata</span>);
                            })}
                          </div>
                        )}

                        {showWordCnt && hasWarning && (
                          <div className="bg-yellow-900/30 border border-yellow-600/60 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-yellow-400 mb-1.5">⚠️ Dialog melebihi batas:</p>
                            {promptWarnings[index].map((w, wi) => <p key={wi} className="text-xs text-yellow-300 ml-2">· {w}</p>)}
                          </div>
                        )}

                        {segments.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-1">
                            {segments.map((_, segIdx) => {
                              const key      = `${index}-${segIdx}`;
                              const isCopied = copiedSegmentKey === key;
                              return (
                                <button key={segIdx} onClick={() => copySegment(prompt, index, segIdx)}
                                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-all ${isCopied ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-300 border-gray-600 hover:bg-gray-700 hover:border-purple-500 hover:text-white'}`}>
                                  {isCopied ? <><span>✓</span><span>Segmen {segIdx + 1} Tersalin!</span></> : <><span>📋</span><span>Salin Segmen {segIdx + 1}</span></>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Segmen Lanjutan (bebas mode) */}
                  {promptMode === 'bebas' && prompts.length > 0 && (() => {
                    const visualDetail  = visualRefs[0] || nameDesc || '[PRODUK/TEMPAT]';
                    const lanjutanText  = `Lanjutkan video sebelumnya secara natural kurang dari ${segmentDuration} detik. Akhir Dialog: "klik tag lokasi bawah untuk detailnya ya." MULTI SCENE. NO TEXT. NO MUSIC. No cut-off dialogue. CLEAR SUBJECT LOCK. ANTI BLUR. Pertahankan konsistensi warna, pencahayaan, dan suasana. Semua visual HANYA menampilkan ${visualDetail}.`;
                    return (
                      <div className="flex flex-col gap-3 border-t border-purple-700 pt-6 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-yellow-400">▶ SEGMEN LANJUTAN (Extend Sora)</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Untuk memperpanjang video di Sora</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(lanjutanText); setCopiedLanjutan(true); setTimeout(() => setCopiedLanjutan(false), 2000); }}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-all ${copiedLanjutan ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-300 border-gray-600 hover:bg-gray-700 hover:border-purple-500 hover:text-white'}`}>
                            {copiedLanjutan ? '✓ Tersalin!' : '📋 Salin Segmen Lanjutan'}
                          </button>
                        </div>
                        <div className="bg-gray-900/70 border border-purple-800/60 rounded-lg px-4 py-3">
                          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{lanjutanText}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Sub-komponen kecil ────────────────────────────────────────────────────

function ModeSelector({ promptMode, setPromptMode, modeAllowed }: { promptMode: string; setPromptMode: (m: PromptModeKey) => void; modeAllowed: (m: PromptModeKey) => boolean }) {
  const modes = [
    { id: 'bebas' as PromptModeKey,       label: 'Bebas',       badge: 'TikTok GO'        },
    { id: 'rapi' as PromptModeKey,        label: 'Rapi',        badge: 'TikTok GO'        },
    { id: 'urai' as PromptModeKey,        label: 'Urai Skrip',  badge: 'Universal'        },
    { id: 'skrip-jualan' as PromptModeKey,label: 'Skrip Jualan',badge: 'Produk Affiliate' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {modes.map(({ id, label, badge }) => {
        const allowed = modeAllowed(id);
        const active  = promptMode === id;
        return (
          <button key={id} onClick={() => allowed && setPromptMode(id)}
            title={!allowed ? '⭐ Mode Pro — Upgrade untuk akses' : ''}
            className={`py-3 px-2 rounded-lg font-semibold transition-all text-sm leading-tight flex flex-col items-center gap-1 relative ${active ? 'bg-yellow-500 text-gray-900' : allowed ? 'bg-gray-700/50 text-white hover:bg-gray-700' : 'bg-gray-800/30 text-zinc-600 cursor-not-allowed'}`}>
            <span className="flex items-center gap-1">{label}{!allowed && <span className="text-xs">⭐</span>}</span>
            <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${active ? 'bg-gray-900/20 text-gray-800' : badge === 'Produk Affiliate' ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>{badge}</span>
          </button>
        );
      })}
    </div>
  );
}

function AppearanceSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-purple-300">🎭 Karakter On-Screen</p>
      <div className="grid grid-cols-1 gap-2">
        {characterAppearanceOptions.map(opt => (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${value === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}>
            <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 ${value === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
            <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{opt.label}</span><span className="text-xs text-zinc-500">{opt.description}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DialogSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-purple-300">🗣️ Strategi Dialog</p>
      <div className="grid grid-cols-1 gap-2">
        {dialogStrategyOptions.map(opt => (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${value === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}>
            <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 ${value === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
            <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{opt.label}</span><span className="text-xs text-zinc-500">{opt.description}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScenePreviewBox({ scenePreview, segmentDuration, mode }: { scenePreview: { n: number; onScreen: boolean; hasDialog: boolean }[]; segmentDuration: string; mode: string }) {
  const totalAdegan = mode === 'urai' ? (segmentDuration === '10' ? 5 : 8) : (segmentDuration === '10' ? 5 : 7);
  return (
    <div className="bg-gray-900/60 border border-purple-800/60 rounded-lg px-4 py-3">
      <p className="text-xs font-semibold text-purple-300 mb-2">📋 Pola per segmen ({segmentDuration} detik = {totalAdegan} adegan{mode === 'urai' ? ', ~2 detik/adegan' : ''}):</p>
      <div className="flex flex-wrap gap-2">
        {scenePreview.map(({ n, onScreen, hasDialog }) => (
          <div key={n} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium ${onScreen ? 'bg-purple-800/50 border-purple-500 text-purple-200' : 'bg-gray-800/60 border-gray-600 text-zinc-400'}`}>
            <span className="font-bold">A{n}</span>
            <span>{onScreen ? '🎭' : '🎬'}</span>
            <span className="text-zinc-500">{hasDialog ? '🗣️' : '🔇'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
