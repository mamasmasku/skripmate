/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  { id: 'ugc', number: 1, title: 'UGC (User Generated Content)', description: 'Terasa dibuat oleh pengguna biasa, otentik dan jujur.' },
  { id: 'storytelling', number: 2, title: 'Storytelling', description: 'Memiliki alur cerita yang jelas untuk membangun emosi.' },
  { id: 'soft-selling', number: 3, title: 'Soft Selling', description: 'Edukasi halus & informatif, fokus pada manfaat.' },
  { id: 'problem-solution', number: 4, title: 'Problem–Solution', description: 'Mulai dari masalah yang relevan dengan audiens.' },
  { id: 'cinematic', number: 5, title: 'Cinematic', description: 'Visual dominan, minim dialog, membangun kesan premium.' },
  { id: 'listicle', number: 6, title: 'Listicle', description: 'Informasi terstruktur & jelas, mudah dipahami.' },
];

const characterAppearanceOptions = [
  { id: 'adegan-1-2', label: 'Adegan 1 & 2', description: 'Karakter on-screen di 2 adegan pertama tiap segmen' },
  { id: 'adegan-1-saja', label: 'Adegan 1 saja', description: 'Karakter on-screen hanya di adegan pembuka tiap segmen' },
  { id: 'adegan-1-dan-penutup', label: 'Adegan 1 & penutup segmen terakhir', description: 'On-screen di adegan 1 tiap segmen + adegan terakhir segmen terakhir' },
  { id: 'adegan-1-2-dan-penutup', label: 'Adegan 1, 2 & penutup segmen terakhir', description: 'On-screen di adegan 1 & 2 tiap segmen + adegan terakhir segmen terakhir' },
];

const ctaTypeOptions = [
  { id: 'affiliate-keranjang', label: '🛒 Affiliate — Keranjang Bawah', description: 'Ajakan beli lewat keranjang/tag di bawah video untuk harga lebih hemat' },
  { id: 'affiliate-lokasi', label: '📍 Affiliate — Tag Lokasi', description: 'Ajakan klik tag lokasi di bawah untuk cek harga & promo terdekat' },
  { id: 'umum-follow', label: '👆 Konten Umum — Follow', description: 'Ajakan follow akun untuk konten serupa' },
  { id: 'umum-share', label: '🔁 Konten Umum — Share', description: 'Ajakan share video ke teman/keluarga' },
];

const dialogStrategyOptions = [
  { id: 'voice-over-penuh', label: 'Voice Over Penuh', description: 'Dialog berjalan di semua adegan sepanjang video. Karakter tidak perlu on-screen untuk bernarasi — suara VO tetap terdengar di atas visual produk.' },
  { id: 'hanya-on-screen', label: 'Dialog Hanya Saat On-Screen', description: 'Dialog hanya ada saat karakter muncul di layar. Adegan tanpa karakter = visual diam tanpa narasi.' },
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

const countDialogWords = (segmentText: string): number => {
  const dialogMatches = segmentText.match(/Dialog:\s*"([^"]+)"/g) || [];
  const allDialog = dialogMatches
    .map(d => d.replace(/Dialog:\s*"/, '').replace(/"$/, '').trim())
    .filter(d => d.length > 0)
    .join(' ');
  return allDialog.trim().split(/\s+/).filter(Boolean).length;
};

const validateDialogLength = (promptText: string, segDuration: string, isUrai = false): string[] => {
  const maxWords = isUrai
    ? (segDuration === '10' ? 35 : 48)
    : (segDuration === '10' ? 28 : 40);
  const segments = promptText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
  return segments
    .map((seg, i) => {
      const wordCount = countDialogWords(seg);
      if (wordCount > maxWords) return `Segmen ${i + 1}: ${wordCount} kata (batas ${maxWords} kata untuk ${segDuration} detik)`;
      return null;
    })
    .filter(Boolean) as string[];
};

const getSegmentWordCounts = (promptText: string, segDuration: string, isUrai = false): { count: number; max: number }[] => {
  const maxWords = isUrai
    ? (segDuration === '10' ? 35 : 48)
    : (segDuration === '10' ? 28 : 40);
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
  const offScreenText = offScreenScenes.length > 0
    ? `adegan ${offScreenScenes.join(', ')} (dan semua adegan kecuali penutup segmen terakhir jika berlaku)`
    : '';

  return `**ATURAN KEMUNCULAN KARAKTER ON-SCREEN — KERAS, TIDAK BOLEH DILANGGAR:**

Karakter HANYA BOLEH TERLIHAT DI LAYAR pada: ${onScreen}.

Pada adegan lainnya (${offScreenText}):
- Karakter TIDAK BOLEH terlihat on-screen dalam bentuk apapun
- TIDAK bicara ke kamera, TIDAK memegang produk, TIDAK ada gestur, TIDAK ada bagian tubuhnya
- Visual HARUS 100% fokus pada: objek utama konten, suasana/konteks yang relevan, detail produk/subjek, atau elemen pendukung narasi

PERBEDAAN ON-SCREEN dan VOICE OVER:
- On-screen = karakter terlihat di video (wajah/tubuh tampak)
- Voice over = suara narasi yang terdengar di atas visual, TANPA karakter terlihat
- Adegan tanpa karakter on-screen TETAP BISA memiliki dialog voice over — suaranya terdengar tapi orangnya tidak terlihat

CEK WAJIB sebelum menulis setiap adegan: apakah ini termasuk adegan on-screen karakter?
→ Jika YA: deskripsikan karakter secara visual (ekspresi, gestur, dll.)
→ Jika TIDAK: deskripsikan HANYA visual produk/tempat. Karakter tidak boleh disebut secara visual.`;
};

const buildDialogRule = (
  strategyId: string,
  appearanceId: string,
  segmentDuration: string,
  maxWords: number,
  totalScenes: number
): string => {
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

    return `**ATURAN DIALOG — VOICE OVER PENUH:**

Konsep: dialog berjalan TERUS-MENERUS dari adegan 1 hingga adegan ${totalScenes} seperti narasi video. Karakter tidak harus terlihat untuk bernarasi — suara voice over tetap terdengar di atas visual produk/tempat.

SEMUA adegan dari 1 hingga ${totalScenes} WAJIB memiliki dialog. TIDAK ada adegan tanpa dialog.

POLA DIALOG per adegan dalam 1 segmen (${segmentDuration} detik, maks ${maxWords} kata total):
${Array.from({ length: totalScenes }, (_, i) => {
  const n = i + 1;
  const onScr = isOnScreen(n);
  const isHook = n === 1;
  const isCTA = n === totalScenes;
  const words = onScr ? onScreenWords : voWords;
  const role = isHook ? 'hook / pembuka — sedikit lebih panjang' : isCTA ? 'jembatan ke segmen berikutnya atau CTA penutup' : onScr ? 'narasi keunggulan utama' : 'narasi detail visual — pendek, padat';
  const type = onScr ? '🎭 on-screen' : '🎙️ voice over';
  return `- Adegan ${n} (${type}): ~${words} kata — ${role}`;
}).join('\n')}

CEK WAJIB: total kata semua dialog ≤ ${maxWords} kata per segmen.`;
  }

  const onScreenSceneNums = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => isOnScreen(n));
  const offScreenSceneNums = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => !isOnScreen(n));
  const maxWordsOnScreen = Math.round(maxWords / onScreenSceneNums.length * 1.1);

  return `**ATURAN DIALOG — HANYA SAAT KARAKTER ON-SCREEN:**

Dialog HANYA ADA di adegan di mana karakter terlihat on-screen.
Adegan tanpa karakter = Dialog: "" (tanda kutip kosong, wajib ditulis, TIDAK boleh dihilangkan).

Adegan BERNARASI: adegan ${onScreenSceneNums.join(', ')} → WAJIB ada dialog
Adegan TANPA NARASI: adegan ${offScreenSceneNums.join(', ')} → WAJIB Dialog: ""

ALOKASI KATA untuk ${onScreenSceneNums.length} adegan bernarasi (total maks ${maxWords} kata):
- Rata-rata sekitar ${maxWordsOnScreen} kata per adegan on-screen

CEK WAJIB: hitung kata semua dialog berisi → harus ≤ ${maxWords} kata total per segmen.`;
};

const buildUraiDialogRule = (
  appearanceId: string,
  segmentDuration: string,
  maxWords: number,
  totalScenes: number
): string => {
  const isOnScreen = (sceneNum: number): boolean => {
    switch (appearanceId) {
      case 'adegan-1-saja': return sceneNum === 1;
      case 'adegan-1-dan-penutup': return sceneNum === 1 || sceneNum === totalScenes;
      case 'adegan-1-2-dan-penutup': return sceneNum <= 2 || sceneNum === totalScenes;
      default: return sceneNum <= 2;
    }
  };
  const wordsPerScene = Math.floor(maxWords / totalScenes);
  const onScreenWords = Math.round(wordsPerScene * 1.2);
  const voWords = Math.round(wordsPerScene * 0.85);

  return `**ATURAN DISTRIBUSI DIALOG DARI SKRIP — MODE URAI:**

Konsep: SKRIP yang diberikan adalah dialog/narasi FINAL. Tugasmu:
1. Membagi skrip ke dalam segmen berdasarkan durasi yang dipilih.
2. Mendistribusikan kalimat-kalimat dari skrip ke dalam adegan per segmen.
3. JANGAN UBAH kata-kata dari skrip. Potong HANYA di jeda natural (koma, titik, jeda napas).
4. Setiap adegan berisi 1–2 kalimat pendek dari skrip yang natural diucapkan dalam ~2 detik.

POLA DISTRIBUSI DIALOG per adegan dalam 1 segmen (${segmentDuration} detik, ~${totalScenes} adegan, maks ${maxWords} kata):
${Array.from({ length: totalScenes }, (_, i) => {
  const n = i + 1;
  const onScr = isOnScreen(n);
  const words = onScr ? onScreenWords : voWords;
  const type = onScr ? '🎭 on-screen' : '🎙️ voice over';
  const role = n === 1 ? 'pembuka / hook dari skrip' : n === totalScenes ? 'penutup / CTA dari skrip' : 'narasi lanjutan dari skrip';
  return `- Adegan ${n} (${type}): ~${words} kata — ${role}`;
}).join('\n')}

SEMUA adegan WAJIB memiliki dialog dari skrip (voice over penuh).
CEK WAJIB: total kata dialog per segmen ≤ ${maxWords} kata.`;
};

const buildStyleGuide = (styleIds: string[]): string => {
  const allGuides: Record<string, string> = {
    'ugc': `**[UGC] User Generated Content:**
NADA: Jujur, spontan, seperti orang biasa yang beneran nyobain — bukan influencer berbayar.
HOOK WAJIB GAYA INI: Pembuka terasa pengakuan jujur + info lokasi hemat.
STRUKTUR SKRIP: Hook jujur (info hemat) → cerita pengalaman pertama → detail yang bikin kaget/senang → manfaat spesifik → CTA natural.
CIRI KHAS DIALOG: Filler natural (eh, loh, beneran deh, serius), bahasa sehari-hari informal, cerita pengalaman personal.
VISUAL: Selfie-style medium shot wajah natural, close-up produk spontan tidak sempurna, wide shot suasana ramai/natural.`,

    'storytelling': `**[Storytelling]:**
NADA: Emosional, membangun rasa penasaran, ada konflik kecil dan resolusi yang memuaskan.
HOOK WAJIB GAYA INI: Buka dengan situasi/kebutuhan yang relatable, lalu info lokasi hemat muncul sebagai "temuan penting".
STRUKTUR SKRIP: Hook situasi (+ info hemat sebagai temuan) → konflik/kebutuhan yang membangun → pertemuan dengan produk → momen "wow" yang emosional → resolusi memuaskan → CTA.
CIRI KHAS DIALOG: Kalimat membangun antisipasi ("dan ternyata…", "yang bikin aku kaget adalah…", "sampai akhirnya…").
VISUAL: Wide shot dramatis pembuka, close-up ekspresi karakter di momen emosional, slow detail produk, lighting mood-ful.`,

    'soft-selling': `**[Soft Selling]:**
NADA: Edukatif, informatif — terasa seperti berbagi pengetahuan berguna, bukan menjual.
HOOK WAJIB GAYA INI: Buka dengan fakta atau insight menarik tentang sistem harga.
STRUKTUR SKRIP: Hook fakta (+ info hemat sebagai insight) → edukasi manfaat utama produk → perbandingan/konteks yang memperkuat → tips atau insight tambahan → CTA yang terasa logis bukan memaksa.
CIRI KHAS DIALOG: "faktanya…", "yang bikin ini beda adalah…", "banyak yang belum tau…".
VISUAL: Close-up detail produk yang indah dan informatif, medium shot yang menunjukkan proses/kualitas.`,

    'problem-solution': `**[Problem–Solution]:**
NADA: Empati dulu — bangun rasa "iya bener banget!" — lalu berikan solusi yang tegas dan meyakinkan.
HOOK WAJIB GAYA INI: Buka dengan masalah yang sangat relatable, lalu info hemat muncul sebagai solusi langsung.
STRUKTUR SKRIP: Hook masalah relatable (+ solusi hemat sebagai pivot) → perburukan masalah yang membangun urgensi → produk/tempat sebagai solusi konkret → bukti bahwa solusi berhasil → resolusi melegakan → CTA.
CIRI KHAS DIALOG: "pernah nggak kamu…?", "capek nggak sih kalau…", "tapi sekarang…".
VISUAL: Wide shot situasi problematik → ekspresi berubah saat ketemu solusi → close-up solusi (produk), ekspresi lega dan puas.`,

    'cinematic': `**[Cinematic]:**
NADA: Tenang, premium, minimal tapi setiap kata berdampak — kesan aspirasional dan elegan.
HOOK WAJIB GAYA INI: Kalimat sangat pendek dan puitis, info hemat disampaikan dengan tone elegan dan eksklusif.
STRUKTUR SKRIP: Opening satu kalimat kuat (info hemat, elegan) → keistimewaan produk disampaikan puitis → satu atau dua detail sensorik yang kuat → CTA elegan dan pendek.
CIRI KHAS DIALOG: Kalimat sangat pendek (5–8 kata per kalimat), puitis, biarkan visual berbicara lebih banyak dari dialog, tone aspirasional.
VISUAL: Sinematik penuh — slow motion, golden hour lighting, macro shot detail produk, depth of field dangkal, komposisi simetris, transisi elegan.`,

    'listicle': `**[Listicle]:**
NADA: Jelas, terstruktur, to-the-point — penonton tahu persis apa yang akan mereka dapat sejak detik pertama.
HOOK WAJIB GAYA INI: Buka dengan janji konten yang jelas + info hemat sebagai poin pertama.
STRUKTUR SKRIP: Hook "ada N hal yang harus kamu tau" (poin 1 = info hemat) → poin 2 (keunggulan produk utama) → poin 3 (favorit/climax) → CTA yang terasa sebagai tindakan logis setelah mendengar list.
CIRI KHAS DIALOG: "pertama…", "kedua…", "yang ketiga dan ini yang paling bikin aku balik lagi…", kalimat pendek dan padat per poin.
VISUAL: Shot yang clean dan terorganisir — setiap adegan visual merepresentasikan satu poin dengan jelas, medium shot informatif, close-up produk tepat di poin yang relevan.`,
  };

  const uniqueStyles = [...new Set(styleIds)];
  return uniqueStyles.map(id => allGuides[id] ?? allGuides['ugc']).join('\n\n');
};

const INDONESIAN_CONTEXT_RULE = `**ATURAN KONTEKS VISUAL INDONESIA — WAJIB DITERAPKAN DI SEMUA ADEGAN:**

UANG / TRANSAKSI:
- Selalu tulis: "uang kertas Rupiah Indonesia", "lembaran Rupiah merah pecahan 100 ribu"
- JANGAN tulis: "uang", "cash", "bills", "money" tanpa keterangan

ORANG / LATAR / FIGURAN:
- Untuk orang di LATAR atau figuran (bukan karakter utama): tambahkan "pengunjung berkulit sawo matang", "orang Indonesia"
- JANGAN ubah atau tambahkan deskripsi fisik pada karakter utama`;

const LARANGAN_DIALOG_RULE = `**ATURAN DIALOG AMAN — WAJIB DIPATUHI DI SEMUA KALIMAT:**

DILARANG KERAS menyebut kata/frasa berikut dalam dialog, ganti dengan alternatif yang tertera:
- "terbaik" / "nomor 1" / "paling bagus" → ganti: "salah satu yang disukai banyak orang"
- "termurah" / "paling murah" / "murah banget" / "banting harga" → ganti: "harganya cukup bersahabat" / "harga terjangkau"
- "paling ampuh" / "paling efektif" / "paling cepat" → ganti: "bantu memaksimalkan" / "hasil tiap orang beda"
- "100% berhasil" / "anti gagal" / "jaminan berhasil" / "pasti berhasil" → ganti: "banyak yang cocok" / "bantu mempermudah"
- "menyembuhkan" / "mengobati" / "terapi" → ganti: "membantu meredakan" / "mendukung aktivitas"
- "hasil instan" / "seketika" / "instan" → ganti: "terlihat lebih cepat pada sebagian orang" / "bekerja perlahan"
- "permanen" / "hasil permanen" → ganti: "bisa bertahan lama bila rutin"
- "kurus" / "gemuk" / "obesitas" / "berat badan" / "menurunkan berat badan" / "menaikkan berat badan" → ganti: "lebih ringan" / "bobot tubuh" / "bantu mengelola bobot"
- "mengecilkan perut/lengan/paha" → ganti: "bantu merapikan area tersebut"
- "tinggi badan" / "menambah tinggi" → ganti: "postur tubuh" / "bantu mendukung postur"
- "tubuh ideal" / "tubuh sempurna" / "langsing instan" → ganti: "versi terbaik dari diri sendiri"
- "memutihkan" / "mencerahkan permanen" / "whitening permanen" → ganti: "mencerahkan bertahap" / "bantu menjaga kecerahan"
- "menghilangkan jerawat 100%" → ganti: "membantu merawat kulit berjerawat"
- DILARANG menyebut angka harga spesifik (contoh: "cuma 50 ribu", "harganya 200 ribu") — ganti dengan: "harganya terjangkau" / "harga bersahabat" / "cukup ramah di kantong"
- DILARANG klaim harga terendah atau perbandingan harga dengan kompetitor secara spesifik`;

// ── NEW: Rapi Dengan Text Overlay system prompt builder ───────────────────
const buildRapiDenganTextSystemPrompt = (
  category: string,
  character: string,
  segmentDuration: string,
  activeStyleGuide: string,
  stylePerContent: string,
  ctaType: 'affiliate-lokasi' | 'affiliate-keranjang' | 'umum-follow' | 'umum-share' = 'affiliate-lokasi',
  totalDuration: string = '15', 
): string => {
  const is10s = segmentDuration === '10';
  const totalScenes = is10s ? 4 : 6;

  const timeSlots = is10s
    ? [
        { from: '0', to: '2', label: 'HOOK' },
        { from: '2', to: '5', label: 'BODY' },
        { from: '5', to: '8', label: 'CTA' },
        { from: '8', to: '10', label: 'BODY' },
      ]
    : [
        { from: '0', to: '3', label: 'HOOK' },
        { from: '3', to: '7', label: 'BODY' },
        { from: '7', to: '10', label: 'BODY' },
        { from: '10', to: '13', label: 'CTA' },
        { from: '13', to: '15', label: 'BODY' },
      ];

  const ctaTemplates: Record<string, { kalimat1: string; kalimat2: string; text: string; aturan: string }> = {
    'affiliate-lokasi': {
      kalimat1: '[keunggulan/promo utama yang memukau]',
      kalimat2: '[ajakan klik tag lokasi di bawah video untuk harga lebih hemat]',
      text: '📍 Klik lokasi sekarang',
      aturan: 'Kalimat 1 = keunggulan/promo produk. Kalimat 2 = ajakan klik TAG LOKASI di bawah video untuk dapat harga lebih hemat. WAJIB sebut "tag lokasi" atau "lokasi di bawah".',
    },
    'affiliate-keranjang': {
      kalimat1: '[keunggulan/promo utama yang memukau]',
      kalimat2: '[ajakan klik keranjang kuning/ikon keranjang di bawah video untuk beli lebih hemat]',
      text: '🛒 Klik keranjang sekarang',
      aturan: 'Kalimat 1 = keunggulan/promo produk. Kalimat 2 = ajakan klik KERANJANG KUNING atau ikon keranjang di bawah video. WAJIB sebut "keranjang" atau "keranjang di bawah". Jangan sebut lokasi.',
    },
    'umum-follow': {
      kalimat1: '[rangkuman manfaat/nilai konten yang baru ditonton]',
      kalimat2: '[ajakan follow akun untuk dapat konten serupa]',
      text: '➕ Follow sekarang',
      aturan: 'Kalimat 1 = rangkuman manfaat/insight konten. Kalimat 2 = ajakan FOLLOW akun untuk dapat konten bermanfaat serupa. JANGAN sebut beli/lokasi/keranjang.',
    },
    'umum-share': {
      kalimat1: '[rangkuman manfaat/nilai konten yang baru ditonton]',
      kalimat2: '[ajakan share ke teman/orang terdekat yang butuh info ini]',
      text: '🔁 Share ke temanmu',
      aturan: 'Kalimat 1 = rangkuman manfaat/insight konten. Kalimat 2 = ajakan SHARE ke teman atau orang yang butuh info ini. JANGAN sebut beli/lokasi/keranjang.',
    },
  };

  const cta = ctaTemplates[ctaType];
  const charLabel = character || 'Karakter';

const wordsPerSec = 3;
const numSegments = Math.ceil(parseInt(totalDuration) / parseInt(segmentDuration));

// Bangun template per segmen berdasarkan posisinya
const buildSegmentTemplate = (segIdx: number): string => {
  const isFirst = segIdx === 0;
  const isLast = segIdx === numSegments - 1;
  const segNum = segIdx + 1;

  let slots: { from: string; to: string; label: string }[];
  if (numSegments === 1) {
    slots = timeSlots; // 1 segmen: pakai penuh HOOK+BODY+CTA+PENUTUP
  } else if (isFirst) {
    slots = is10s
      ? [{ from: '0', to: '4', label: 'HOOK' }, { from: '4', to: '10', label: 'BODY' }]
      : [{ from: '0', to: '4', label: 'HOOK' }, { from: '4', to: '10', label: 'BODY' }, { from: '10', to: '15', label: 'BODY' }];
  } else if (isLast) {
    slots = is10s
      ? [{ from: '0', to: '4', label: 'BODY' }, { from: '4', to: '8', label: 'CTA' }, { from: '8', to: '10', label: 'BODY' }]
      : [{ from: '0', to: '5', label: 'BODY' }, { from: '5', to: '10', label: 'BODY' }, { from: '10', to: '13', label: 'CTA' }, { from: '13', to: '15', label: 'BODY' }];
  } else {
    slots = is10s
      ? [{ from: '0', to: '5', label: 'BODY' }, { from: '5', to: '10', label: 'BODY' }]
      : [{ from: '0', to: '5', label: 'BODY' }, { from: '5', to: '10', label: 'BODY' }, { from: '10', to: '15', label: 'BODY' }];
  }

  const slotWordsLocal = slots.map(slot => ({
    ...slot,
    maxWords: Math.round((parseInt(slot.to) - parseInt(slot.from)) * wordsPerSec),
  }));

  let bodyCountLocal = 0;
  let ctaSeenLocal = false;
  const sections = slotWordsLocal.map(slot => {
    const isCTA = slot.label === 'CTA';
    const isHook = slot.label === 'HOOK';
    if (slot.label === 'BODY') bodyCountLocal++;
    const currentBody = bodyCountLocal;
    const isClosingBody = slot.label === 'BODY' && ctaSeenLocal;
    if (isCTA) ctaSeenLocal = true;
    const durSec = parseInt(slot.to) - parseInt(slot.from);

    let content = '';
    if (isHook) {
      content = `Voice over (maks ${slot.maxWords} kata / ${durSec} detik): "[hook kuat — fakta mengejutkan atau keunggulan utama produk]"\nText di layar: [emoji] [HOOK TEXT KAPITAL VIRAL] [emoji]`;
    } else if (isCTA) {
      const kataPerKalimat = Math.floor(slot.maxWords / 2);
      content = `${charLabel} on-screen (maks ${slot.maxWords} kata total / ${durSec} detik):\nKalimat 1: "${cta.kalimat1} — maks ${kataPerKalimat} kata"\nKalimat 2: "${cta.kalimat2} — maks ${kataPerKalimat} kata"\nText: ${cta.text}`;
    } else if (isClosingBody) {
      content = `Voice over (maks ${slot.maxWords} kata / ${durSec} detik): "[penutup singkat — SAMBUNG dari narasi segmen sebelumnya]"\nText overlay: [emoji] [tagline pendek] [emoji]`;
    } else {
      const sambungNote = segIdx > 0 ? ` — LANJUTKAN narasi dari segmen ${segNum - 1}` : '';
      content = `Voice over (maks ${slot.maxWords} kata / ${durSec} detik): "[narasi body — detail keunggulan/fakta menarik${sambungNote}]"\nText overlay: [emoji] [poin keunggulan singkat] [emoji]`;
    }

    const sectionLabel = isCTA ? 'CTA' : isHook ? 'HOOK' : isClosingBody ? `BODY ${currentBody} (PENUTUP)` : `BODY ${currentBody}`;
    return `${slot.from}–${slot.to} DETIK — ${sectionLabel}\n${content}`;
  }).join('\n\n⸻\n');

  const segMaxWords = slotWordsLocal.reduce((sum, s) => sum + s.maxWords, 0);
  return { sections, segMaxWords };
};

const allSegmentTemplates = Array.from({ length: numSegments }, (_, i) => buildSegmentTemplate(i));
const totalMaxWords = allSegmentTemplates.reduce((sum, s) => sum + s.segMaxWords, 0);

// Gabungkan jadi scriptSections multi-segmen
const scriptSections = allSegmentTemplates
  .map((seg, i) => `[SEGMEN ${i + 1}]\n${seg.sections}`)
  .join('\n\n--\n\n');

// slotWords tetap dibutuhkan untuk aturan panjang dialog di prompt
const slotWords = timeSlots.map(slot => ({
  ...slot,
  maxWords: Math.round((parseInt(slot.to) - parseInt(slot.from)) * wordsPerSec),
}));  

  const ctaGesture = ctaType === 'affiliate-keranjang'
    ? `${charLabel} [menunjuk ke bawah ke arah ikon keranjang, ekspresi antusias dan persuasif]`
    : ctaType === 'affiliate-lokasi'
    ? `${charLabel} [menunjuk ke arah tag lokasi di bawah, ekspresi antusias dan persuasif]`
    : ctaType === 'umum-follow'
    ? `${charLabel} [gestur ajakan follow — menunjuk ke layar/akun, ekspresi ramah dan engaging]`
    : `${charLabel} [gestur ajakan share — ekspresi antusias, tangan membuka ke arah penonton]`;

// SESUDAH
const getSceneVisual = (n: number, total: number): string => {
  if (category === 'Produk Jualan') {
    const visuals = [
      `wide shot produk ${nameDesc} terdisplay rapi dengan latar bersih, pencahayaan studio`,
      `close-up detail kemasan/label produk dari sudut depan, tekstur terlihat jelas`,
      `medium shot produk dari sudut samping, memperlihatkan dimensi dan bentuk`,
      `macro shot tekstur/detail unik produk yang paling menarik`,
      `wide shot produk dalam konteks penggunaan sehari-hari, suasana natural`,
      `close-up logo dan branding produk dengan bokeh latar yang elegan`,
    ];
    return visuals[(n - 1) % visuals.length];
  } else if (category === 'Hotel') {
    const visuals = [
      `wide shot interior kamar lengkap dengan pencahayaan hangat dan tempat tidur rapi`,
      `medium shot area fasilitas (kolam renang/lobby) dengan suasana keseluruhan`,
      `close-up detail amenities premium — handuk, toiletries, dekorasi kamar`,
      `wide shot eksterior hotel dari sudut terbaik, langit cerah`,
      `medium shot pemandangan dari jendela kamar, view yang menakjubkan`,
      `wide shot area makan/restoran hotel dengan suasana nyaman`,
    ];
    return visuals[(n - 1) % visuals.length];
  } else if (category === 'Tempat Wisata') {
    const visuals = [
      `wide shot panorama lokasi ${nameDesc} dengan landmark dan langit cerah`,
      `medium shot spot ikonik dengan pengunjung di latar, suasana ramai`,
      `close-up detail unik tempat wisata — ornamen, tekstur, elemen khas`,
      `wide shot area berbeda yang menarik dari lokasi ini`,
      `medium shot aktivitas/keunikan tempat dalam konteks lingkungan penuh`,
      `golden hour wide shot seluruh area, pencahayaan dramatis`,
    ];
    return visuals[(n - 1) % visuals.length];
  } else if (category === 'Konten Umum/Bebas') {
    const visuals = [
      `wide shot suasana yang relevan dengan topik konten, pencahayaan natural`,
      `medium shot elemen utama konten dengan konteks lingkungan terlihat jelas`,
      `close-up detail yang memperkuat pesan narasi`,
      `wide shot transisi ke sudut pandang berbeda, memperkaya visual`,
      `medium shot pendukung yang melengkapi cerita`,
      `wide shot penutup yang merangkum keseluruhan konteks`,
    ];
    return visuals[(n - 1) % visuals.length];
  } else {
    // Makanan/Minuman
    const visuals = [
      `wide shot hidangan ${nameDesc} lengkap di meja dengan suasana outlet terlihat`,
      `close-up detail makanan/minuman — tekstur, warna, steam mengepul`,
      `medium shot proses penyajian dengan counter/dapur terlihat di latar`,
      `macro shot gigitan pertama atau tuangan minuman yang menggugah selera`,
      `wide shot interior outlet nyaman dengan pengunjung di latar`,
      `medium shot minuman/makanan dari sudut 45 derajat, pencahayaan warm`,
    ];
    return visuals[(n - 1) % visuals.length];
  }
};

const sceneList = Array.from({ length: totalScenes }, (_, i) => {
  const n = i + 1;
  const isCTAScene = n === Math.ceil(totalScenes * 0.7);
  if (isCTAScene) return `Scene ${n}: ${ctaGesture}`;
  return `Scene ${n}: ${getSceneVisual(n, totalScenes)}`;
}).join('\n');

  const categoryVisual = category === 'Hotel'
    ? 'fresh, premium, dan elegan'
    : category === 'Tempat Wisata'
    ? 'hidup, menarik, dan mengundang rasa ingin berkunjung'
    : category === 'Produk Jualan'
    ? 'menarik, berkualitas, dan menggiurkan untuk dibeli'
    : 'segar, menggiurkan, dan appetizing';

  const sfxExample = category === 'Hotel'
    ? 'ambient hotel lobby, soft music, door opening sound'
    : category === 'Tempat Wisata'
    ? 'ambient crowd noise, nature sounds, excited atmosphere'
    : category === 'Produk Jualan'
    ? 'satisfying unboxing sound, product click, upbeat energy'
    : 'sizzle sound / crunchy bite / liquid pour, ambient store noise';

  const categorySubject = category === 'Hotel'
    ? 'room & facility'
    : category === 'Tempat Wisata'
    ? 'location & attraction'
    : 'produk & detail';

  return `Kamu adalah AI Scriptwriter & Creative Director untuk konten TikTok viral dalam Bahasa Indonesia, DIBEKALI KEMAMPUAN PENCARIAN GOOGLE.

TUGAS: Buat prompt video TikTok produksi profesional — lengkap dengan visual brief, gaya video, alur scene, dan skrip ber-time-code dengan text overlay TikTok style.

**ALUR KERJA WAJIB — 3 TAHAP:**

TAHAP 1 — RISET MENDALAM
Gunakan Google Search untuk mencari info tentang nama & deskripsi yang diberikan. Cari:
- Detail visual produk: warna, bentuk, kemasan, logo, merek
- Keunikan, menu/varian, harga/promo terkini
- Suasana tempat/toko
- Target pasar dan momen konsumsi ideal
JANGAN mulai menulis output sebelum selesai riset.

TAHAP 2 — TULIS SKRIP LENGKAP
Berdasarkan hasil riset dan gaya konten yang ditentukan (${stylePerContent}), tulis narasi penuh dari HOOK hingga CTA sebelum memformat ke template.

ATURAN KARAKTER — KERAS, TIDAK BOLEH DILANGGAR:
- ${charLabel} BOLEH muncul di section HOOK dan BODY, tapi TIDAK BOLEH mendominasi frame
- Di HOOK dan BODY: visual utama WAJIB adalah ${
  category === 'Produk Jualan' ? 'PRODUK (kemasan, detail, close-up)' :
  category === 'Hotel' ? 'FASILITAS HOTEL (kamar, kolam, lobby)' :
  category === 'Tempat Wisata' ? 'LOKASI WISATA (panorama, spot ikonik)' :
  category === 'Konten Umum/Bebas' ? 'KONTEKS KONTEN yang relevan' :
  'MAKANAN/MINUMAN (plating, tekstur, suasana tempat)'
} — karakter boleh ada tapi sebagai elemen pendukung, bukan subjek utama
- Di CTA: ${charLabel} tampil ON-SCREEN penuh, bicara 2 kalimat langsung ke kamera
- BODY PENUTUP setelah CTA: kembali ke visual produk/tempat, karakter boleh ada di latar
- DILARANG: scene yang isinya hanya karakter berbicara tanpa produk/tempat terlihat sama sekali
- DILARANG: karakter mendominasi lebih dari 1 scene berturut-turut di luar section CTA
- Di section HOOK dan BODY: dialog disampaikan sebagai Voice Over (suara terdengar, orangnya tidak terlihat)
- Di CTA: karakter muncul on-screen, bicara 2 kalimat:
  → ${cta.aturan}
  → DILARANG membalik urutan ini
- Setelah CTA: video ditutup dengan BODY PENUTUP VISUAL — visual produk sinematik, voice over 1 kalimat singkat, TANPA karakter on-screen

TAHAP 3 — FORMAT OUTPUT
LANGSUNG mulai output dengan ▶ SEGMEN 1 tanpa komentar, penjelasan, atau intro apapun.

===

**PANDUAN GAYA KONTEN:**
${activeStyleGuide}

===

${LARANGAN_DIALOG_RULE}

===

**FORMAT OUTPUT PER SEGMEN — IKUTI 100%:**

▶ SEGMEN [N] ([X] detik)

Pemeran karakter: ${charLabel}, ${category}, gaya konten [sesuai distribusi], REAL VIDEO ONLY, setiap adegan WAJIB menampilkan gerakan nyata. DILARANG slideshow atau foto diam yang hanya di-pan/zoom.
[Nama produk/tempat] [deskripsi visual lengkap hasil riset — 1-2 kalimat deskriptif dan spesifik]
• [Detail visual 1: kemasan/logo/warna/merek yang khas — deskripsi spesifik dari hasil riset]
• [Detail visual 2: tekstur/bentuk/penampilan yang menarik — detail menggiurkan/premium]
• [Detail visual 3: hal khas yang membedakan dari kompetitor — unik dan memorable]

LATAR BELAKANG:
• [Lingkungan/suasana spesifik dari hasil riset: nama toko/outlet, tipe interior, ciri khas]
• [Elemen dekorasi, properti, atau display khas tempat]
• [Jenis pencahayaan: warm indoor / natural daylight / neon / golden hour / dll]

ATURAN PENTING: Bentuk, warna, kemasan, dan logo produk HARUS identik sepanjang video. Jangan ubah tampilan produk. Produk harus tampil ${categoryVisual}.

⸻
GAYA VIDEO
• [Video style utama sesuai gaya konten: Smartphone vlog style / Cinematic / Raw UGC / Creator style / dll]
• Close-up ${categorySubject} shots
• TikTok creator energy — energik dan autentik
• Slight handheld movement — terasa natural dan spontan
• Macro detail [subjek produk/tempat] texture dan close-up impactful
• Fast jump cuts sesuai ritme dialog
• SFX: [efek suara spesifik dan natural, contoh: ${sfxExample}]
Add TikTok style subtitles, promo graphics, and engaging overlay text.

⸻
ALUR VIDEO
${sceneList}

⸻
SCRIPT VIDEO (${segmentDuration} DETIK)

${scriptSections}

--

[segmen berikutnya jika ada]

===

**ATURAN FORMAT WAJIB:**
- Awali tiap segmen dengan '▶ SEGMEN [N] ([X] detik)'.
- Pisahkan segmen dengan '--', pisahkan multi-konten dengan '*****'.
- Total segmen WAJIB: ${numSegments} segmen (${totalDuration} detik ÷ ${segmentDuration} detik). DILARANG kurang.
- ATURAN NARASI MULTI-SEGMEN: Dialog MENYAMBUNG antar segmen — satu cerita utuh. Segmen 1 = HOOK + pembuka. Segmen tengah = lanjutan narasi. Segmen terakhir = puncak + CTA. DILARANG mulai hook baru di segmen 2 dst.
- DILARANG tanda kurung [ ] di output akhir — isi SEMUA placeholder dengan konten nyata hasil riset.
- DILARANG penjelasan/komentar apapun sebelum atau sesudah output. Langsung mulai ▶ SEGMEN 1.
- DILARANG menuliskan kata "Karakter" sebelum nama/handle karakter.
- CTA dialog: kalimat PERTAMA = keunggulan/promo, kalimat KEDUA = ajakan klik tag lokasi bawah video. DILARANG membalik urutan.
- Text overlay: gunakan emoji relevan + teks KAPITAL singkat yang viral dan eye-catching.
- SFX: deskripsi suara WAJIB spesifik (bukan hanya "SFX ada" — tulis bunyi spesifik apa yang terdengar).
- Jika membuat lebih dari 1 konten: SETIAP konten wajib menggunakan gaya konten berbeda sesuai distribusi, hook BERBEDA di setiap konten.
- Awali tiap segmen dengan '▶ SEGMEN [N] ([X] detik)' lalu langsung baris kedua 'Pemeran karakter: ${charLabel}, ...' — JANGAN ada baris kosong di antara keduanya.

ATURAN PANJANG DIALOG — WAJIB DIPATUHI:
Patokan: ~3 kata per detik. Batas per section TIDAK BOLEH dilewati.
${slotWords.map(s => `• ${s.from}–${s.to} dtk (${parseInt(s.to)-parseInt(s.from)} dtk) → maks ${s.maxWords} kata`).join('\n')}
Total seluruh segmen: maks ${totalMaxWords} kata.
CEK WAJIB sebelum output: hitung kata setiap section — jika melebihi batas, potong sampai sesuai.
DILARANG menambah kalimat extra dengan alasan "lebih informatif" — padat dan singkat lebih baik.

${INDONESIAN_CONTEXT_RULE}

LARANGAN VISUAL PLATFORM LAIN — WAJIB:
- DILARANG menampilkan layar HP yang menunjukkan aplikasi order (GoFood, GrabFood, Shopee Food, Tokopedia, Shopee, TikTok Shop, dll)
- DILARANG menampilkan UI/interface aplikasi apapun di layar HP atau tablet
- DILARANG menampilkan struk digital, notifikasi order, atau konfirmasi pembelian dari platform lain
- Jika perlu tunjukkan "cara order": tangan mengetuk udara, gestur menunjuk ke bawah, atau karakter bicara ke kamera — TANPA layar HP
- Jika perlu tunjukkan "harga lebih murah": visual produk dengan label harga fisik, karakter memegang uang Rupiah, atau gestur jempol ke bawah — TANPA layar HP
INSTRUKSI FORMAT OUTPUT — SANGAT PENTING:
- DILARANG KERAS menampilkan bagian "ATURAN PANJANG DIALOG", "ALUR KERJA", "TAHAP", atau instruksi apapun dari system prompt ini di dalam output
- Output HANYA berisi: deskripsi produk visual, latar belakang, gaya video, alur video, dan skrip time-coded
- Langsung mulai output dengan '▶ SEGMEN 1' tanpa komentar, tanpa penjelasan, tanpa aturan apapun`;
};

// ── Tipe ──────────────────────────────────────────────────────────────────
type PromptModeKey = 'bebas' | 'rapi' | 'urai' | 'skrip-jualan';
type RapiSubModeKey = 'tanpa-text' | 'dengan-text';

// ── Modal ganti password ──────────────────────────────────────────────────
function ChangePwModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!cur || !next) return;
    setBusy(true); setMsg('');
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'change-password', currentPassword: cur, newPassword: next }) });
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
  const { user, token, isLoading: authLoading, loginError, login, logout, updateCredits, upgradeRole, refreshUser } = useAuth();

  // ── Modal states ──────────────────────────────────────────────────────
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // ── Free user: API key ────────────────────────────────────────────────
  const [freeApiKey, setFreeApiKey] = useState<string>(() => {
    try { return localStorage.getItem(FREE_API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showFreeKey, setShowFreeKey] = useState(false);
  const [savedFreeKey, setSavedFreeKey] = useState(false);
  // ── Admin manual API key (opsional) ──────────────────────────────────
const [adminUseManualKey, setAdminUseManualKey] = useState(false);
const [adminApiKey, setAdminApiKey] = useState('');
const [showAdminKey, setShowAdminKey] = useState(false);
  const saveFreeApiKey = (key: string) => {
    setFreeApiKey(key);
    try { if (key) localStorage.setItem(FREE_API_KEY_STORAGE, key); else localStorage.removeItem(FREE_API_KEY_STORAGE); } catch {}
  };

  // ── Per-mode prompt storage ───────────────────────────────────────────
  const [promptsByMode, setPromptsByMode] = useState<Record<string, string[]>>({});
  const [warningsByMode, setWarningsByMode] = useState<Record<string, string[][]>>({});
  const [visualRefsByMode, setVisualRefsByMode] = useState<Record<string, string[]>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [activeStyles, setActiveStyles] = useState<string[]>(['ugc']);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSegmentKey, setCopiedSegmentKey] = useState<string | null>(null);
  const [copiedLanjutan, setCopiedLanjutan] = useState(false);

  const [category, setCategory] = useState('Makanan/Minuman');
  const [nameDesc, setNameDesc] = useState('');
  const [character, setCharacter] = useState('');
  const [segmentDuration, setSegmentDuration] = useState('15');
  const [totalDuration, setTotalDuration] = useState('15');
  const [contentCount, setContentCount] = useState('1');
  const [promptMode, setPromptMode] = useState<PromptModeKey>('bebas');
  const [rapiSubMode, setRapiSubMode] = useState<RapiSubModeKey>('tanpa-text');
  const [ctaType, setCtaType] = useState('affiliate-lokasi');
  const [loadingText, setLoadingText] = useState('Menganalisa & membuat prompt...');
  const [generateError, setGenerateError] = useState('');

  const [characterAppearance, setCharacterAppearance] = useState('adegan-1-2');
  const [dialogStrategy, setDialogStrategy] = useState('voice-over-penuh');
  const [scriptInput, setScriptInput] = useState('');

const storageKey = promptMode === 'rapi' ? `rapi-${rapiSubMode}` : promptMode;
const prompts = promptsByMode[storageKey] ?? [];
const promptWarnings = warningsByMode[storageKey] ?? [];
const visualRefs = visualRefsByMode[storageKey] ?? [];

  const [skripJualanOutput, setSkripJualanOutput] = useState('');
  const [isSkripJualanLoading, setIsSkripJualanLoading] = useState(false);
  const [skripJualanLoadingText, setSkripJualanLoadingText] = useState('Membuat skrip...');

  // ── Auth gate ─────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <LoginScreen onLogin={login} isLoading={authLoading} error={loginError} />;

  const isPro = user.role === 'admin' || user.credits > 0;
  const isAdmin = user.role === 'admin';

  const modeAllowed = (mode: PromptModeKey): boolean => {
    if (isPro) return true;
    return mode === 'bebas';
  };

  const loadingMessages = ['Mencari ide-ide sinematik...', 'Meracik hook yang menarik...', 'Mengembangkan detail visual...', 'Menyusun narasi yang kuat...', 'Finalisasi prompt video...'];
  const uraiLoadingMessages = ['Membaca skrip...', 'Menentukan jumlah segmen...', 'Membagi dialog ke setiap adegan...', 'Merancang visual per adegan...', 'Finalisasi prompt Sora...'];
  const rapiDenganTextLoadingMessages = ['Riset produk lewat Google...', 'Merancang visual brief...', 'Menyusun alur scene...', 'Menulis skrip & text overlay...', 'Finalisasi prompt TikTok...'];
  const skripLoadingMessages = ['Memilih hook yang tepat...', 'Menyusun rumus storytelling...', 'Merangkai narasi produk...', 'Menulis caption & hashtag...', 'Finalisasi skrip...'];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      const messages =
        promptMode === 'urai' ? uraiLoadingMessages
        : (promptMode === 'rapi' && rapiSubMode === 'dengan-text') ? rapiDenganTextLoadingMessages
        : loadingMessages;
      let i = 0; setLoadingText(messages[0]);
      interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingText(messages[i]); }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading, promptMode, rapiSubMode]);
  useEffect(() => {
  if (!token) return;
  const interval = setInterval(() => {
    refreshUser();
  }, 30_000);
  return () => clearInterval(interval);
}, [token, refreshUser]);

  const toggleStyle = (styleId: string) => {
    setActiveStyles(prev => {
      if (prev.includes(styleId)) return prev.length > 1 ? prev.filter(s => s !== styleId) : prev;
      return [...prev, styleId];
    });
  };

  const downloadPrompts = () => {
    const visualDetail = visualRefs[0] || nameDesc || '[PRODUK/TEMPAT]';
    const lanjutanSection = promptMode === 'bebas' && prompts.length > 0
      ? `\n\n---\n\n▶ SEGMEN LANJUTAN (Extend Sora)\nLanjutkan video sebelumnya secara natural kurang dari ${segmentDuration} detik. Akhir Dialog: "klik tag lokasi bawah untuk detailnya ya." MULTI SCENE. NO TEXT. NO MUSIC. No cut-off dialogue. CLEAR SUBJECT LOCK. ANTI BLUR. Pertahankan konsistensi warna, pencahayaan, dan suasana dari video sebelumnya. Semua visual HANYA menampilkan ${visualDetail}.`
      : '';
    const content = prompts.join('\n\n---\n\n') + lanjutanSection;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sora-prompts.txt';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handlePromptChange = (newText: string, index: number) => {
    const storageKey = promptMode === 'rapi' ? `rapi-${rapiSubMode}` : promptMode;
    const updated = [...prompts]; updated[index] = newText;
    setPromptsByMode(prev => ({ ...prev, [storageKey]: updated }));
    if ((promptMode === 'rapi' && rapiSubMode === 'tanpa-text') || promptMode === 'urai' || promptMode === 'bebas') {
      const updatedWarnings = [...promptWarnings];
      updatedWarnings[index] = validateDialogLength(newText, segmentDuration, promptMode === 'urai');
      setWarningsByMode(prev => ({ ...prev, [storageKey]: updatedWarnings }));
    }
  };

  const copyPrompt = (text: string, index: number) => {
    const start = text.indexOf('▶ SEGMEN');
    navigator.clipboard.writeText(start !== -1 ? text.substring(start) : text);
    setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copySegment = (fullText: string, promptIndex: number, segmentIndex: number) => {
    const segments = fullText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
    const target = segments[segmentIndex];
    if (target) {
      navigator.clipboard.writeText(target.trim().replace(/^▶ SEGMEN[^\n]*\n/, '').trim());
      const key = `${promptIndex}-${segmentIndex}`;
      setCopiedSegmentKey(key); setTimeout(() => setCopiedSegmentKey(null), 2000);
    }
  };

  const extractSegments = (text: string): string[] =>
    text.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));

  const getScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 7;
    const isOnScreen = (n: number): boolean => {
      switch (characterAppearance) {
        case 'adegan-1-saja': return n === 1;
        case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes;
        case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes;
        default: return n <= 2;
      }
    };
    return Array.from({ length: totalScenes }, (_, i) => {
      const n = i + 1;
      const onScreen = isOnScreen(n);
      return { n, onScreen, hasDialog: dialogStrategy === 'voice-over-penuh' ? true : onScreen };
    });
  };

  const getDenganTextScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 4 : 6;
    return Array.from({ length: totalScenes }, (_, i) => {
      const n = i + 1;
      const isCTA = n === totalScenes;
      return { n, onScreen: isCTA, hasDialog: true, isCTA };
    });
  };

  const getUraiScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 8;
    const isOnScreen = (n: number): boolean => {
      switch (characterAppearance) {
        case 'adegan-1-saja': return n === 1;
        case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes;
        case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes;
        default: return n <= 2;
      }
    };
    return Array.from({ length: totalScenes }, (_, i) => {
      const n = i + 1;
      return { n, onScreen: isOnScreen(n), hasDialog: true };
    });
  };

  // ── Panggil API dengan auth header ────────────────────────────────────
  const callGemini = async (body: Record<string, unknown>) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const res = await fetch('/api/gemini', { method: 'POST', headers, body: JSON.stringify(body) });
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
  userPrompt: buildSkripJualanUserPrompt(config),
  systemInstruction: buildSkripJualanSystemPrompt(config),
  temperature: 0.8,
  useSearch: false,
  promptMode: 'skrip-jualan',
  contentCount: String(config.jumlahSkrip),
  ...(isAdmin && adminUseManualKey
    ? { userApiKey: adminApiKey, adminManualKey: true }
    : !isPro
    ? { userApiKey: freeApiKey }
    : {}),
});
      setSkripJualanOutput(data.text || '');
      if (data.credits !== undefined && !(isAdmin && adminUseManualKey)) updateCredits(data.credits);
    } catch (e: any) {
      setGenerateError(e.message);
      setSkripJualanOutput(`❌ ${e.message}`);
    } finally {
      clearInterval(interval); setIsSkripJualanLoading(false);
    }
  };

  // ── Handler Generate Prompt ───────────────────────────────────────────
  const handleGenerate = async () => {
     const storageKey = promptMode === 'rapi' ? `rapi-${rapiSubMode}` : promptMode; 
    setIsLoading(true);
    setGenerateError('');
    setPromptsByMode(prev => ({ ...prev, [storageKey]: [] }));
    setWarningsByMode(prev => ({ ...prev, [storageKey]: [] }));

    const getStyleTitle = (id: string) => contentStyles.find(s => s.id === id)?.title || id;
    const count = parseInt(contentCount) || 1;
    const styleDistribution = Array.from({ length: count }, (_, i) => activeStyles[i % activeStyles.length]);
    const stylePerContent = styleDistribution.map((s, i) => `Konten ${i + 1}: ${getStyleTitle(s)}`).join('\n');

    const isUraiMode = promptMode === 'urai';
    const isDenganTextMode = promptMode === 'rapi' && rapiSubMode === 'dengan-text';
    const totalScenes = isUraiMode ? (segmentDuration === '10' ? 5 : 8) : (segmentDuration === '10' ? 5 : 7);
    const maxWords = isUraiMode ? (segmentDuration === '10' ? 35 : 48) : (segmentDuration === '10' ? 28 : 40);

    const creditCost = calcCreditCost(promptMode, totalDuration, segmentDuration, contentCount, scriptInput);

    const activeStyleGuide = buildStyleGuide(activeStyles);

    // ── MODE BEBAS ────────────────────────────────────────────────────
    const bebasModeInstruction = `Kamu adalah AI pembuat Sora Video Prompt Mamas dalam Bahasa Indonesia yang dibekali kemampuan pencarian Google. Tugas utamamu adalah MENCARI INFORMASI tentang input user, lalu membuat prompt video yang SANGAT SPESIFIK, deskriptif, dan sinematik berdasarkan format dan aturan baru di bawah ini.

**PROSES BERPIKIR (WAJIB DIIKUTI):**
1. **PENCARIAN & RISET:** Gunakan Google Search untuk mencari informasi detail tentang [NAMA & DESKRIPSI] yang diberikan user.
2. **KEMBANGKAN DESKRIPSI:** Berdasarkan hasil pencarian, buat paragraf deskripsi yang kaya dan menggugah selera/minat.
3. **IDENTIFIKASI MANFAAT/USE-CASE:** Dari hasil riset, tentukan untuk siapa atau untuk momen apa produk/tempat ini cocok.
4. **TULIS SELURUH DIALOG DULU:** Sebelum membuat format prompt, tulis semua kalimat dialog dari awal hingga akhir dalam 1 blok teks mengalir:
   - Kalimat pertama = hook dari BANK HOOK sesuai kategori (wajib). WAJIB diawali dengan "iya nih ............, iya nih ............, " sebelum kalimat hook.
   - Lanjutan = narasi produk dari hasil riset sesuai gaya konten
   - Kalimat terakhir = CTA singkat ajak klik lokasi bawah
   - Hitung segmen: Total Durasi ÷ Durasi Segmen = jumlah segmen — dialog dibagi merata ke tiap segmen
5. **KONSTRUKSI PROMPT:** Ambil dialog yang sudah ditulis di langkah 4, potong ke segmen di jeda natural, lalu masukkan ke format prompt. WAJIB gunakan kalimat dialog yang sudah ditulis — DILARANG membuat dialog baru.

**FORMAT PROMPT BARU (WAJIB DIIKUTI 100%):**
'Buatkan video realistic [KARAKTER LENGKAP] sedang review [NAMA & DESKRIPSI HASIL RISET YANG DETAIL], REAL VIDEO ONLY setiap adegan WAJIB menampilkan gerakan nyata. DILARANG slideshow atau foto diam yang hanya di-pan/zoom kameranya.

Opening visual 0–2 detik hanya menampilkan visual sinematik dari [PRODUK/HOTEL/TEMPAT WISATA] sebagai hook visual

dialog: "iya nih ............, iya nih ............, [KALIMAT DARI DIALOG YANG SUDAH DITULIS DI LANGKAH 4]+[Lanjutan dialog berikutnya dari langkah 4]".

semua scene berikutnya HANYA menampilkan visual produk/tempat secara sinematik (close up produk, detail tekstur, suasana tempat, aktivitas sekitar), [KARAKTER] muncul kembali di 2 detik terakhir sebagai penutup. Tampilkan [DETAIL VISUAL HASIL RISET].

Model yang berbicara adalah [KARAKTER] dengan gaya santai dan meyakinkan, menjelaskan kelebihan [NAMA PRODUK/TEMPAT] dengan antusias supaya orang tertarik datang dan beli.

Jelaskan bahwa [PRODUK/TEMPAT] ini cocok untuk [MANFAAT/USE-CASE HASIL RISET].

Buat tampilan video yang hidup, menarik, real dan realistis seperti konten TikTok Go. Videonya berkualitas ultra HD 4K keren. Video tertata rapi dari opening, review rasa, penjelasan harga dan varian, sampai closing tanpa terpotong.

video tanpa musik tanpa teks, tanpa menampilkan layar HP, tanpa UI aplikasi order apapun, tanpa struk digital atau notifikasi pembelian dari platform lain, REAL VIDEO dengan gerakan nyata — bukan slideshow, bukan foto yang digeser atau di-pan, bukan zoom statis. Setiap adegan HARUS menampilkan motion alami: orang bergerak, makanan dituang, tangan mengambil produk, uap mengepul, ekspresi berubah — bukan gambar diam yang kameranya saja yang bergerak'

**ATURAN HOOK (SANGAT PENTING):**
- **UNTUK SEGMEN 1:** Hook HARUS kalimat pertama dari dialog yang sudah ditulis di langkah 4 — diambil dari BANK HOOK SEGMEN 1.
- **UNTUK SEGMEN 2 DST:** Lanjutkan dialog dari langkah 4 di titik terakhir segmen sebelumnya berhenti. DILARANG mengulang atau membuat dialog baru — sambung tepat dari kalimat berikutnya. WAJIB tetap diawali "iya nih ............, iya nih ............, " sebelum kalimat sambungannya.
- **SETIAP SEGMEN** adalah potongan dialog yang menyambung dari segmen sebelumnya seperti satu video panjang yang dipotong.
- **SEGMEN TERAKHIR** wajib diakhiri dengan CTA dari dialog langkah 4.
- **SETIAP KONTEN BARU (setelah *****)** mulai dialog baru dari awal dengan hook berbeda.

**ATURAN CTA PENUTUP (WAJIB):**
- HANYA ditambahkan di prompt SEGMEN TERAKHIR dari setiap konten, tidak di segmen lainnya.
- Inti pesan yang WAJIB tersampaikan: ajak penonton klik tag lokasi di bawah untuk dapat harga lebih hemat dan cek lokasi terdekat.
- Kalimatnya BEBAS dikreasikan. Yang penting inti pesannya sama.
- DILARANG menggunakan kalimat yang persis sama antar konten jika membuat lebih dari 1.

**ATURAN FORMAT OUTPUT LAINNYA:**
- Awali setiap segmen dengan '▶ SEGMEN [N] ([X] detik)'.
- Pisahkan segmen dengan '--'.
- Pisahkan beberapa konsep video dengan '*****'.
- JANGAN gunakan format list atau poin, seluruh output harus dalam format paragraf naratif yang menyatu sesuai template.
- DILARANG menuliskan kata "Karakter" sebelum nama/handle karakter.
- SETIAP dialog di awal tiap segmen WAJIB diawali dengan "iya nih ............, iya nih ............, "
- Sebelum '▶ SEGMEN 1' di setiap konten, WAJIB tulis satu baris: 'VISUAL_REF: [deskripsikan secara spesifik hasil riset]'

**ATURAN PEMILIHAN HOOK (WAJIB):**
- PILIH SECARA ACAK salah satu hook dari bank yang sesuai kategori — JANGAN selalu ambil yang pertama.
- Setelah memilih, boleh MEMODIFIKASI KREATIF hook tersebut.
- Jika menghasilkan lebih dari 1 konten, WAJIB gunakan hook yang BERBEDA di setiap konten.

---
**BANK HOOK SEGMEN 1:**
===========================
MAKANAN / RESTO

-"Serius deh ini, kalau kamu klik lokasi di bawah, harganya beda. Lebih hemat dibanding beli langsung di tempat. Jangan skip."
-"Jujur ya ini, Yang datang langsung bayar lebih tinggi. Kalau mau lebih hemat, klik lokasi bawah aja. Sistemnya memang begitu."
-"Beneran deh ini, Langsung klik lokasi bawah ya. Lewat sini harganya lebih bersahabat dibanding pesan langsung di kasir."
-"Ini serius sih, Biar nggak keluar biaya lebih besar, pesan lewat tag lokasi bawah. Yang beli langsung selalu kena harga lebih tinggi."
-"Ini beneran sih, Jangan beli langsung—lebih tinggi. Klik lokasi bawah, kamu dapat harga yang lebih enak."
-"Eh serius ya ini, Beneran beda harganya. Klik lokasi bawah kalau kamu mau versi yang lebih hemat daripada beli di tempat."
-"Guys ini serius sih, Kalau kamu klik lokasi bawah, harganya turun. Kalau beli langsung, ya… beda. Pilih yang lebih hemat lah."
-"Eh ini beneran loh, Aku selalu klik lokasi bawah, soalnya harganya lebih rendah daripada pesan langsung. Cobain sendiri."
-"Ini beneran ya, Kalau mau hemat, klik lokasi bawah. Yang beli langsung selalu bayar lebih mahal."
-"Ini asli sih, Pesan lewat tag lokasi bawah itu harganya lebih bersahabat. Datang langsung? Nggak dapet harga itu."

===========================
HOTEL

-"Ini asli sih, Booking lewat lokasi bawah itu harganya lebih rendah daripada walk-in. Mau hemat? Klik lokasi bawah aja."
-"Ini beneran ya, Yang check-in langsung biasanya bayar lebih. Klik lokasi bawah, kamu dapat harga yang lebih ramah."
-"Eh ini beneran loh, klik lokasi bawah. Harga di sana jauh lebih hemat dibanding datang langsung ke counter."
-"Serius deh ini, Kalau kamu booking walk-in, harganya beda. Klik lokasi bawah biar dapat harga yang lebih enak."
-"Jujur ya ini, Jangan langsung datang ya—harga walk-in lebih tinggi. Akses dari lokasi bawah jauh lebih hemat."

===========================
TEMPAT WISATA / TIKET

-"Ini asli sih, Tiket lewat lokasi bawah itu lebih murah dibanding beli langsung di loket. Klik dulu sebelum datang."
-"Ini beneran ya, Jangan beli on the spot. Loket harganya lebih tinggi. Klik lokasi bawah buat harga yang lebih hemat."
-"Eh ini beneran loh, Harganya beda ya. Lokasi bawah kasih kamu harga lebih rendah dibanding beli langsung di pintu masuk."
-"Serius deh ini, Kalau mau hemat, ambil tiket lewat tag lokasi bawah. Yang beli langsung selalu bayar lebih."
-"Jujur ya ini, Klik lokasi bawah. Tiket di sana lebih ramah harga dibanding beli di loket."

===`;

    // ── MODE RAPI (tanpa text) ────────────────────────────────────────
    const characterRule = buildCharacterRule(characterAppearance, totalScenes);
    const dialogRule = buildDialogRule(dialogStrategy, characterAppearance, segmentDuration, maxWords, totalScenes);

    const rapiTanpaTextInstruction = `Kamu adalah AI Scriptwriter dan Visual Director untuk konten review TikTok dalam Bahasa Indonesia, DIBEKALI KEMAMPUAN PENCARIAN GOOGLE. Cari info dulu, tulis skrip penuh sebagai paragraf mengalir, lalu bagi ke segmen dan adegan.

**ALUR KERJA WAJIB — 4 TAHAP:**

TAHAP 1 — RISET
Gunakan Google Search untuk mencari info mendalam tentang nama & deskripsi yang diberikan. Cari keunikan, menu/fasilitas, varian, suasana, harga, target pasar. JANGAN mulai menulis skrip sebelum selesai riset.

TAHAP 2 — TULIS SKRIP PENUH SEBAGAI PARAGRAF MENGALIR
Berdasarkan hasil riset dan GAYA KONTEN yang ditentukan, tulis SELURUH narasi dari hook pertama hingga CTA terakhir dalam satu blok teks mengalir.

PANDUAN PANJANG SKRIP BERDASARKAN TOTAL DURASI:
- 10 detik = ±30 kata
- 15 detik = ±40 kata
- 30 detik = ±80 kata
- 45 detik = ±135 kata
- 60 detik = ±180 kata
- 90 detik = ±260 kata
- KALIMAT PERTAMA WAJIB berupa hook yang kuat sesuai gaya konten${
  (category === 'Makanan/Minuman' || category === 'Hotel' || category === 'Tempat Wisata') || ctaType === 'affiliate-lokasi'
    ? ` — mengandung pesan inti: order lewat tag lokasi di bawah harganya lebih hemat dari datang langsung`
    : ctaType === 'affiliate-keranjang'
    ? ` — mengandung pesan inti: beli lewat keranjang di bawah lebih hemat`
    : ctaType === 'umum-follow'
    ? ` — buka dengan hook yang membuat penonton penasaran dan ingin follow`
    : ` — buka dengan hook yang membuat penonton ingin share ke orang lain`
}
- Hitung dulu: (Total Detik ÷ Durasi Segmen) × Maks Kata Per Segmen = target kata skrip
- Tulis skrip hingga MENDEKATI target kata — JANGAN berhenti di setengahnya
- Kalimat sambung menyambung natural, tidak ada label section
- JANGAN langsung ke format segmen — selesaikan paragraf skrip penuh dulu
- CTA PENUTUP WAJIB: ${
  ctaType === 'affiliate-lokasi'
    ? 'ajak penonton klik tag lokasi di bawah untuk harga lebih hemat'
    : ctaType === 'affiliate-keranjang'
    ? 'ajak penonton klik keranjang di bawah untuk beli lebih hemat'
    : ctaType === 'umum-follow'
    ? 'ajak penonton follow akun untuk dapat konten serupa'
    : 'ajak penonton share video ke teman yang butuh info ini'
}

RUMUS ALUR NARASI (pilih salah satu sesuai gaya konten):
- UGC / Problem-Solution: Hook relatable → pengalaman personal → temuan produk/tempat → detail menarik → CTA
- Storytelling: Hook situasi → konflik kecil → momen "wow" → resolusi memuaskan → CTA
- Soft Selling / Listicle: Hook fakta/insight → edukasi poin 1 → poin 2 → poin 3 → CTA logis
- Cinematic: Kalimat pendek puitis → detail sensorik kuat → keistimewaan → CTA elegan
${category === 'Produk Jualan' ? '→ Fokus manfaat & keunggulan produk, akhiri dengan ajakan beli di keranjang bawah/cek keranjang bawah' :
  category === 'Konten Umum/Bebas' ? '→ Fokus nilai/insight konten, akhiri dengan ajakan follow/share' :
  '→ Fokus pengalaman & keunggulan tempat, akhiri dengan ajakan klik lokasi bawah'}
  
TAHAP 3 — BAGI SKRIP KE SEGMEN & ADEGAN
- Hitung segmen WAJIB: Total Durasi ÷ Durasi per Segmen
- SETIAP segmen maksimal ${maxWords} kata dialog — DILARANG melebihi batas ini
- DILARANG menggabungkan semua dialog ke 1 segmen meskipun skrip terasa menyatu
- CEK WAJIB FINAL: hitung segmen dari total ÷ durasi, WAJIB ada segmen sebanyak itu

TAHAP 4 — FORMAT OUTPUT
LANGSUNG mulai output dengan ▶ SEGMEN 1 tanpa penjelasan, tanpa intro, tanpa komentar apapun.

===

**PANDUAN GAYA KONTEN:**
${activeStyleGuide}

===

${dialogRule}

===

${characterRule}

===

**FORMAT OUTPUT — IKUTI 100%:**

▶ SEGMEN [N] ([X] detik)
Buatkan video realistic ${character || 'faceless'} ${
  category === 'Produk Jualan' ? `mempromosikan ${nameDesc}` :
  category === 'Konten Umum/Bebas' ? `membawakan konten tentang ${nameDesc}` :
  `sedang review ${nameDesc}`
} dengan gaya [GAYA KONTEN], Durasi [DURASI SEGMEN] detik, MULTI SCENE, NO TEXT, CLEAR SUBJECT LOCK, ANTI BLUR VIDEO. REAL VIDEO ONLY setiap adegan WAJIB menampilkan gerakan nyata. DILARANG slideshow atau foto diam yang hanya di-pan/zoom kameranya.

Deskripsi visual adegan 1, Dialog: "kalimat dialog 1"
Deskripsi visual adegan 2, Dialog: "kalimat dialog 2"
Deskripsi visual adegan 3, Dialog: "kalimat dialog 3"
Deskripsi visual adegan 4, Dialog: "kalimat dialog 4"
Deskripsi visual adegan 5, Dialog: "kalimat dialog 5"
${totalScenes === 7 ? `Deskripsi visual adegan 6, Dialog: "kalimat dialog 6"
Deskripsi visual adegan 7, Dialog: "kalimat dialog 7"` : ''}

===

${LARANGAN_DIALOG_RULE}

${INDONESIAN_CONTEXT_RULE}

===

**ATURAN FORMAT TAMBAHAN:**
- WAJIB awali tiap segmen dengan '▶ SEGMEN [N] ([X] detik)'.
- WAJIB pisahkan segmen dengan '--', pisahkan konten dengan '*****'.
- DILARANG tanda kurung [ ] dalam deskripsi visual output.
- DILARANG penjelasan/komentar apapun sebelum atau sesudah output. Langsung mulai dengan '▶ SEGMEN 1'.
- DILARANG menuliskan kata "Karakter" sebelum nama/handle karakter. Langsung tulis nama/handle-nya.
- Jika membuat lebih dari 1 konten: SETIAP konten WAJIB menggunakan gaya berbeda sesuai distribusi. Hook dan struktur narasi HARUS berbeda antar konten

LARANGAN VISUAL PLATFORM LAIN — WAJIB:
- DILARANG menampilkan layar HP yang menunjukkan aplikasi order (GoFood, GrabFood, Shopee Food, Tokopedia, Shopee, TikTok Shop, dll)
- DILARANG menampilkan UI/interface aplikasi apapun di layar HP atau tablet
- DILARANG menampilkan struk digital, notifikasi order, atau konfirmasi pembelian dari aplikasi lain
- DILARANG visual tangan mengetuk/scroll layar HP yang menampilkan platform lain

- ATURAN VISUAL — WAJIB FOKUS KE OBJEK KONTEN:
  Mayoritas adegan (minimal ${totalScenes === 5 ? '4' : '5'} dari ${totalScenes} adegan per segmen) HARUS menampilkan visual objek utama, bukan karakter.

  ${category === 'Produk Jualan' ? `UNTUK PRODUK JUALAN:
  Prioritaskan visual: wide shot produk dalam konteks penggunaan, medium shot detail kemasan/logo dari berbagai sudut, close-up tekstur/fitur unik produk, wide shot lifestyle yang relevan dengan produk.`
  : category === 'Hotel' ? `UNTUK REVIEW HOTEL:
  Prioritaskan visual: wide shot interior kamar lengkap dengan pencahayaan hangat, medium shot area fasilitas (kolam, lobby) dengan suasana keseluruhan terlihat, wide shot eksterior hotel, medium shot detail amenities dalam konteks ruangan penuh.`
  : category === 'Tempat Wisata' ? `UNTUK REVIEW TEMPAT WISATA:
  Prioritaskan visual: wide shot panorama lokasi dengan landmark dan pengunjung terlihat, medium shot spot ikonik dengan suasana sekitar, wide shot area berbeda yang menarik, medium shot aktivitas atau keunikan tempat dalam konteks lingkungan penuh.`
  : category === 'Konten Umum/Bebas' ? `UNTUK KONTEN UMUM/BEBAS:
  Prioritaskan visual: wide shot suasana yang relevan dengan topik konten, medium shot elemen utama konten dengan konteks lingkungan terlihat, close-up detail yang memperkuat narasi, wide shot penutup yang merangkum keseluruhan konten.`
  : `UNTUK REVIEW MAKANAN/MINUMAN:
  Prioritaskan visual: wide shot hidangan lengkap di meja dengan suasana outlet terlihat, medium shot detail makanan dengan dekorasi tempat di latar, medium shot proses penyajian dengan counter/dapur terlihat, wide shot interior outlet nyaman dengan pengunjung, medium shot minuman segar dengan meja dan tempat di sekitarnya.`}
`;

    // ── MODE RAPI (dengan text) ───────────────────────────────────────
    const rapiDenganTextInstruction = buildRapiDenganTextSystemPrompt(
      category,
      character,
      segmentDuration,
      activeStyleGuide,
      stylePerContent,
      ctaType,
      totalDuration,
    );

    // ── MODE URAI ─────────────────────────────────────────────────────
    const uraiTotalScenes = segmentDuration === '10' ? 5 : 8;
    const uraiMaxWords = segmentDuration === '10' ? 35 : 48;
    const uraiDialogRule = buildUraiDialogRule(characterAppearance, segmentDuration, uraiMaxWords, uraiTotalScenes);
    const uraiCharacterRule = buildCharacterRule(characterAppearance, uraiTotalScenes);

    const uraiVisualGuide = category === 'Makanan/Minuman'
      ? `UNTUK REVIEW MAKANAN/MINUMAN:
Visual off-screen prioritaskan: wide shot suasana outlet dengan meja dan pengunjung, medium shot hidangan di atas meja dengan dekorasi tempat terlihat, medium shot proses penyajian dengan dapur/counter terlihat di latar, wide shot interior outlet yang nyaman dan menarik.`
      : category === 'Hotel'
      ? `UNTUK REVIEW HOTEL:
Visual off-screen prioritaskan: wide shot interior kamar dengan pencahayaan hangat dan seluruh ruangan terlihat, medium shot area fasilitas (kolam, lobby) dengan suasana keseluruhan terlihat, wide shot eksterior hotel, medium shot detail amenities dalam konteks ruangan.`
      : category === 'Tempat Wisata'
      ? `UNTUK REVIEW TEMPAT WISATA:
Visual off-screen prioritaskan: wide shot panorama lokasi dengan landmark dan pengunjung terlihat, medium shot spot ikonik dengan suasana sekitar terlihat, wide shot area berbeda yang menarik, medium shot aktivitas/keunikan tempat dalam konteks lingkungan.`
      : category === 'Produk Jualan'
      ? `UNTUK KONTEN PRODUK JUALAN:
Visual off-screen prioritaskan: wide shot produk dalam konteks penggunaan sehari-hari, medium shot detail produk dari berbagai sudut, close-up tekstur/detail unik produk, wide shot suasana lifestyle yang relevan dengan produk.`
      : `UNTUK KONTEN UMUM/BEBAS:
Visual off-screen prioritaskan: wide shot suasana yang relevan dengan topik konten, medium shot elemen utama konten dengan konteks lingkungan terlihat, close-up detail yang memperkuat narasi, wide shot penutup yang merangkum keseluruhan konten.`;

    const uraiModeInstruction = `Kamu adalah AI Visual Director untuk konten video TikTok dalam Bahasa Indonesia. Tugasmu adalah mengurai skrip yang diberikan menjadi prompt video Sora yang padat, sinematik, dan siap produksi.

PENTING: Kamu TIDAK PERLU mencari informasi tambahan. Gunakan HANYA skrip yang diberikan sebagai sumber dialog — jangan tambah, ubah, atau kurangi kata-kata skrip.

**PERANMU SEBAGAI SUTRADARA:**
Kamu bertindak seperti sutradara film yang membaca naskah lalu menentukan:
- Berapa segmen yang dibutuhkan berdasarkan panjang skrip dan durasi per segmen
- Shot size yang tepat per adegan (wide, medium, close-up)
- Timing dialog per adegan agar terasa natural dan padat (~2 detik per adegan)
- Di mana karakter muncul vs kapan visual produk/tempat mendominasi

**PROSES BERPIKIR WAJIB:**
1. BACA SKRIP PENUH: Pahami alur, tone, dan pesan keseluruhan skrip.
2. HITUNG SEGMEN: Bagi skrip berdasarkan durasi.
3. BAGI DIALOG: Distribusikan kalimat skrip ke adegan per segmen. Potong HANYA di jeda natural.
4. RANCANG VISUAL: Untuk setiap adegan, buat deskripsi visual sinematik yang mendukung dialog.
5. IKUTI aturan kemunculan karakter dengan ketat.
6. FINALISASI ke format output.

===

${uraiDialogRule}

===

${uraiCharacterRule}

===

**FORMAT OUTPUT — IKUTI 100%:**

▶ SEGMEN [N] ([X] detik)
Buatkan video realistic ${character || 'faceless'} ${category === 'Produk Jualan' ? 'mempromosikan' : category === 'Konten Umum/Bebas' ? 'membawakan konten tentang' : 'mereview'} ${nameDesc || 'sesuai gambar'}, gaya bicara padat dan natural, REAL VIDEO ONLY setiap adegan WAJIB menampilkan gerakan nyata. DILARANG slideshow atau foto diam yang hanya di-pan/zoom kameranya,

Deskripsi visual adegan 1, Dialog: "penggalan skrip adegan 1"
Deskripsi visual adegan 2, Dialog: "penggalan skrip adegan 2"
[lanjutkan untuk semua adegan dalam segmen]

--

[segmen berikutnya jika ada]

===

${LARANGAN_DIALOG_RULE}

${INDONESIAN_CONTEXT_RULE}

===

**ATURAN FORMAT WAJIB:**
- Awali tiap segmen dengan '▶ SEGMEN [N] ([X] detik)'.
- Pisahkan segmen dengan '--'.
- DILARANG tanda kurung [ ] dalam output deskripsi visual.
- DILARANG penjelasan/komentar apapun sebelum atau sesudah output. Langsung mulai dengan '▶ SEGMEN 1'.
- DILARANG menuliskan kata "Karakter" sebelum nama/handle karakter. Langsung tulis nama/handle-nya.
- DILARANG mengubah kata-kata dari skrip asli. Hanya boleh memotong di jeda natural.

**ATURAN VISUAL PER ADEGAN:**
- Dominasi wide shot dan medium shot.
- Close-up MAKSIMAL 1 kali per segmen.

LARANGAN VISUAL PLATFORM LAIN — WAJIB:
- DILARANG menampilkan layar HP yang menunjukkan aplikasi order apapun
- DILARANG menampilkan UI/interface aplikasi apapun di layar HP atau tablet

PANDUAN VISUAL BERDASARKAN KATEGORI:
${uraiVisualGuide}`;

    const systemInstruction =
      promptMode === 'bebas' ? bebasModeInstruction :
      promptMode === 'rapi' ? (rapiSubMode === 'dengan-text' ? rapiDenganTextInstruction : rapiTanpaTextInstruction) :
      uraiModeInstruction;

    const userPrompt = promptMode === 'urai'
      ? `Urai skrip berikut menjadi prompt video Sora yang siap produksi:

Kategori: ${category}
Nama & Deskripsi: ${nameDesc || '-'}
Karakter: ${character || 'faceless'}
Durasi per Segmen: ${segmentDuration} detik
Jumlah Adegan per Segmen: ${isUraiMode ? (segmentDuration === '10' ? 5 : 8) : totalScenes} adegan (~2 detik per adegan)

CATATAN: Sesuaikan gaya visual dan tone dengan kategori "${category}".

SKRIP YANG HARUS DIURAI:
"""
${scriptInput}
"""

Tentukan berapa segmen yang dibutuhkan berdasarkan panjang skrip di atas, lalu buat prompt Sora-nya.`
      : `Buatkan ${contentCount} konten video yang berbeda berdasarkan detail berikut:

Kategori: ${category}
Nama & Deskripsi Singkat: ${nameDesc}
Karakter: ${character || 'faceless'}
Durasi per Segmen: ${segmentDuration} detik
Total Durasi: ${totalDuration} detik

Gaya Konten per video (WAJIB DIIKUTI — setiap konten harus mengikuti panduan gaya yang tertera):
${stylePerContent}`;

    try {
      const data = await callGemini({
  userPrompt,
  systemInstruction,
  temperature: promptMode === 'urai' ? 0.65 : 0.8,
  useSearch: promptMode !== 'urai',
  promptMode,
  totalDuration,
  segmentDuration,
  contentCount,
  scriptInputWordCount: scriptInput.trim().split(/\s+/).filter(Boolean).length,
  rapiSubMode,
  ...(isAdmin && adminUseManualKey
    ? { userApiKey: adminApiKey, adminManualKey: true }
    : !isPro
    ? { userApiKey: freeApiKey }
    : {}),
});

      if (data.credits !== undefined && !(isAdmin && adminUseManualKey)) updateCredits(data.credits);

      const responseText = (data.text || '')
        .replace(/\*\*\*\*\*/g, '|||CONTENT_BREAK|||')
        .replace(/^\-\-\-$/gm, '--')
        .replace(/^\[([^\]]+)\],/gm, '$1,')
        .replace(/^\[([^\]]+)\]$/gm, '$1');

      const generatedPrompts = responseText
        .split('|||CONTENT_BREAK|||')
        .map((p: string) => p.trim())
        .filter((p: string) => p.includes('▶ SEGMEN'));

      const formattedPrompts = generatedPrompts.map((prompt: string, i: number) => {
        const styleId = styleDistribution[i] ?? activeStyles[0];
        const styleTitle = getStyleTitle(styleId);
        const totalSegments = (prompt.match(/▶ SEGMEN/g) || []).length;
        const label = promptMode === 'urai' ? 'URAI SKRIP' : isDenganTextMode ? `${styleTitle.toUpperCase()} + TEXT OVERLAY` : styleTitle.toUpperCase();
        return `═══════════════════════════════════════
KONTEN #${i + 1} — ${label}
═══════════════════════════════════════
Kategori: ${category}
${promptMode === 'urai'
  ? `Durasi per Segmen: ${segmentDuration} detik (${totalSegments} segmen Sora)`
  : `Durasi Target: ${totalDuration} detik (${totalSegments} segmen Sora)`}

${prompt}`;
      });

      setPromptsByMode(prev => ({ ...prev, [storageKey]: formattedPrompts }));

      const refs = formattedPrompts.map((p: string) => {
        const match = p.match(/VISUAL_REF:\s*([^\n]+)/);
        return match ? match[1].trim() : nameDesc;
      });
      setVisualRefsByMode(prev => ({ ...prev, [storageKey]: refs }));

      // Only validate dialog length for rapi tanpa-text and urai
      if ((promptMode === 'rapi' && rapiSubMode === 'tanpa-text') || promptMode === 'urai') {
        const warnings = formattedPrompts.map((p: string) => validateDialogLength(p, segmentDuration, promptMode === 'urai'));
        setWarningsByMode(prev => ({ ...prev, [storageKey]: warnings }));
      }
    } catch (error: any) {
      const msg = error?.message ?? 'Terjadi kesalahan';
      setGenerateError(msg);
      setPromptsByMode(prev => ({ ...prev, [storageKey]: [`❌ ${msg}`] }));
    } finally {
      setIsLoading(false);
    }
  };

  const scenePreview = promptMode === 'urai'
    ? getUraiScenePreview()
    : (promptMode === 'rapi' && rapiSubMode === 'dengan-text')
      ? getDenganTextScenePreview()
      : getScenePreview();

  const estimatedCost = calcCreditCost(promptMode, totalDuration, segmentDuration, contentCount, scriptInput);
  const hasEnoughCredit = isPro ? user.credits >= estimatedCost : true;
  const canGenerate = !isLoading && (isPro ? hasEnoughCredit : !!freeApiKey.trim()) && (promptMode !== 'urai' || !!scriptInput.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-zinc-200 font-sans p-4 sm:p-6 lg:p-8">

      {/* ── Modals ── */}
      {showBuyModal && <BuyCreditsModal token={token!} currentCredits={user.credits} onClose={() => setShowBuyModal(false)} onSuccess={credits => { updateCredits(credits); upgradeRole('pro'); setShowBuyModal(false); }} />}
      {showChangePw && <ChangePwModal token={token!} onClose={() => setShowChangePw(false)} />}
      {showAdminPanel && <AdminPanel token={token!} onClose={() => setShowAdminPanel(false)} />}

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
              onChangePw={() => setShowChangePw(true)}
              onAdminPanel={isAdmin ? () => setShowAdminPanel(true) : undefined}
              onLogout={logout}
              onRefresh={refreshUser}
            />
          </div>
        </header>
{/* ── ADMIN: Toggle API Key ── */}
{isAdmin && (
  <div className="mb-4 p-4 bg-gray-800/60 border border-yellow-700/40 rounded-xl flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>⚙️</span>
        <h3 className="text-sm font-bold text-yellow-400">Mode API Key (Admin)</h3>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setAdminUseManualKey(false)}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${!adminUseManualKey ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700/50 text-zinc-400 hover:text-white'}`}>
          🖥️ Server (LiteLLM)
        </button>
        <button
          onClick={() => setAdminUseManualKey(true)}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${adminUseManualKey ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700/50 text-zinc-400 hover:text-white'}`}>
          🔑 Manual Key
        </button>
      </div>
    </div>
    {adminUseManualKey && (
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showAdminKey ? 'text' : 'password'}
            value={adminApiKey}
            onChange={e => setAdminApiKey(e.target.value)}
            placeholder="Masukkan Gemini API Key manual..."
            className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono"
          />
          <button onClick={() => setShowAdminKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs">
            {showAdminKey ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
    )}
    <p className="text-xs text-zinc-600">
      {adminUseManualKey ? '🔑 Menggunakan API Key manual — langsung ke Gemini, tidak pakai LiteLLM' : '🖥️ Menggunakan server key via LiteLLM — kredit tetap dipotong'}
    </p>
  </div>
)}
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
                <input type={showFreeKey ? 'text' : 'password'} value={freeApiKey} onChange={e => setFreeApiKey(e.target.value)} placeholder="Masukkan Gemini API Key..." className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono" />
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
                <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">⚙️ Mode Prompt</h2>
                  <ModeSelector promptMode={promptMode} setPromptMode={setPromptMode} modeAllowed={modeAllowed} />
                </div>
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
                      <p className="text-xs text-zinc-400">Isi form → AI riset produk lewat Google lalu langsung buat prompt video sinematik gaya TikTok GO. Output berbentuk paragraf naratif siap pakai di Sora, adegan di tentukan oleh sora, untuk panjang dialog atau narasi bisa di edit jika terlalu panjang, seg 10 detik ideal 25 kata, seg 15 detik 37 kata.</p>
                    </div>
                  )}

                  {promptMode === 'rapi' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5 mt-2 pt-4 border-t border-purple-800">

                      {/* Sub-mode selector — NEW */}
                      <RapiSubModeSelector value={rapiSubMode} onChange={setRapiSubMode} />

                      {/* Tanpa Text sub-mode info & options */}
                      {rapiSubMode === 'tanpa-text' && (
                        <>
                          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-yellow-400 mb-1">🎬 Cara Kerja Mode Ini</p>
                            <p className="text-xs text-zinc-400">Isi form → AI riset produk lewat Google, tulis skrip penuh, lalu bagi ke segmen & adegan dengan format visual yang rapi. Tanpa text overlay.</p>
                          </div>
                          <AppearanceSelector value={characterAppearance} onChange={setCharacterAppearance} />
                          <DialogSelector value={dialogStrategy} onChange={setDialogStrategy} />
                          <ScenePreviewBox scenePreview={scenePreview} segmentDuration={segmentDuration} mode="rapi" />
                        </>
                      )}

                      {/* Dengan Text sub-mode info & options — NEW */}
                      {rapiSubMode === 'dengan-text' && (
                        <>
                          <div className="bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-green-400 mb-2">✨ Cara Kerja Mode Ini</p>
                            <div className="flex flex-col gap-1 text-xs text-zinc-400">
                              <p>• AI riset produk → buat <strong className="text-zinc-300">visual brief lengkap</strong> (deskripsi produk, latar, aturan visual)</p>
                              <p>• Output berisi <strong className="text-zinc-300">gaya video + SFX</strong> yang spesifik</p>
                              <p>• Skrip <strong className="text-zinc-300">ber-time-code</strong>: HOOK → BODY → CTA dengan text overlay TikTok</p>
                              <p>• <strong className="text-zinc-300">Karakter hanya muncul di CTA</strong> — kalimat ke-2 ajak klik tag lokasi</p>
                            </div>
                          </div>
                          {/* Scene preview for dengan-text mode */}
                          <CtaTypeSelector value={ctaType} onChange={setCtaType} />
                          <DenganTextScenePreview segmentDuration={segmentDuration} />
                        </>
                      )}
                    </motion.div>
                  )}

                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6 mt-2 pt-4 border-t border-purple-800">
                      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-yellow-400 mb-1">✂️ Cara Kerja Mode Ini</p>
                        <p className="text-xs text-zinc-400">Berikan skripmu → AI bertindak sebagai sutradara: menentukan jumlah segmen, membagi dialog ke setiap adegan (~2 detik/adegan), dan merancang visual sinematik. Dialog tidak diubah, hanya dibagi.</p>
                      </div>
                      <AppearanceSelector value={characterAppearance} onChange={setCharacterAppearance} />
                      <ScenePreviewBox scenePreview={scenePreview} segmentDuration={segmentDuration} mode="urai" />
                    </motion.div>
                  )}
                </div>

                {/* Input User */}
                <div className="flex flex-col gap-6 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">📥 Input User</h2>
                  <div className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-purple-300 mb-2">📌 Panduan Kategori per Mode</p>
                    <div className="flex flex-col gap-1 text-xs text-zinc-500">
                      <p><span className="text-yellow-400 font-medium">Bebas & Rapi</span> → hanya untuk Makanan/Minuman, Hotel, Tempat Wisata (ada bank hook & panduan visual lengkap)</p>
                      <p><span className="text-yellow-400 font-medium">Urai</span> → Membuat Prompt sora dari mengurai Narasi Skrip apa saja, Sesuaikan Kategori dengan apa yang mau di urai</p>
                      <p><span className="text-yellow-400 font-medium">Skrip Jualan</span> → Membuat Narasi Skrip Khusus Jualan pakai kategori Produk Jualan</p>
                    </div>
                  </div>
                  <Select label="Kategori" id="category" value={category} onChange={e => setCategory(e.target.value)}>
                    <option>Makanan/Minuman</option>
                    <option>Hotel</option>
                    <option>Tempat Wisata</option>
                    <option>Produk Jualan</option>
                    <option>Konten Umum/Bebas</option>
                  </Select>
                  <Textarea
                    label={promptMode === 'urai' ? 'Nama & Deskripsi (opsional)' : 'Nama & Deskripsi Singkat'}
                    id="nameDesc"
                    value={nameDesc}
                    onChange={e => setNameDesc(e.target.value)}
                    placeholder={promptMode === 'urai' ? 'Opsional — nama produk, topik konten, atau kosongkan' : 'Contoh: Roti Gembul - roti lembut isi selai coklat lumer...'}
                  />
                  <Input label="Karakter (kosongkan = faceless)" id="character" value={character} onChange={e => setCharacter(e.target.value)} placeholder="Contoh: @batop40 mengenakan pakaian stylish" />

                  {promptMode !== 'urai' ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={e => setSegmentDuration(e.target.value)}>
                        <option value="10">10 detik</option>
                        <option value="15">15 detik</option>
                      </Select>
                      <Input label="Total Durasi (detik)" id="totalDuration" type="number" step="5" value={totalDuration} onChange={e => setTotalDuration(e.target.value)} placeholder="Contoh: 45" />
                      <Input label="Jumlah Konten" id="contentCount" type="number" min="1" value={contentCount} onChange={e => setContentCount(e.target.value)} placeholder="1" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={e => setSegmentDuration(e.target.value)}>
                        <option value="10">10 detik</option>
                        <option value="15">15 detik</option>
                      </Select>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-400">Adegan per Segmen</label>
                        <div className="flex items-center h-10 px-3 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-zinc-400">
                          {segmentDuration === '10' ? '5 adegan' : '8 adegan'} (~2 dtk/adegan)
                        </div>
                      </div>
                    </div>
                  )}

                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <label htmlFor="scriptInput" className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                        ✍️ Skrip / Narasi
                        <span className="text-xs font-normal text-zinc-500">(dijadikan dialog/voice over — tidak diubah)</span>
                      </label>
                      <textarea
                        id="scriptInput"
                        value={scriptInput}
                        onChange={e => setScriptInput(e.target.value)}
                        placeholder="Tulis atau tempel skripmu di sini..."
                        rows={8}
                        className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-zinc-600">AI otomatis menentukan jumlah segmen.</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${scriptInput.trim().split(/\s+/).filter(Boolean).length > 0 ? 'bg-green-900/30 border-green-700/60 text-green-400' : 'bg-gray-800 border-gray-700 text-zinc-600'}`}>
                          {scriptInput.trim().split(/\s+/).filter(Boolean).length} kata
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Gaya Konten */}
                {promptMode !== 'urai' && (
                  <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                    <div className="flex items-center justify-between border-b border-purple-700 pb-3">
                      <h2 className="text-2xl font-semibold text-yellow-400">🎨 Gaya Konten</h2>
                      <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">{activeStyles.length} terpilih · bisa pilih lebih dari 1</span>
                    </div>
                    {activeStyles.length > 1 && (
                      <div className="bg-gray-900/60 border border-purple-800 rounded-lg px-4 py-3">
                        <p className="text-xs text-purple-300 mb-2 font-semibold">📊 Distribusi ke {contentCount} konten:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: Math.min(parseInt(contentCount) || 1, 10) }, (_, i) => {
                            const styleId = activeStyles[i % activeStyles.length];
                            const style = contentStyles.find(s => s.id === styleId);
                            return <span key={i} className="text-xs bg-purple-800/60 text-purple-200 px-2 py-0.5 rounded-full">#{i + 1} {style?.title.split(' ')[0]}</span>;
                          })}
                          {(parseInt(contentCount) || 1) > 10 && <span className="text-xs text-purple-400 italic px-1">+{(parseInt(contentCount) || 1) - 10} lagi...</span>}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contentStyles.map(style => (
                        <StyleButton key={style.id} number={style.number} title={style.title} description={style.description} isActive={activeStyles.includes(style.id)} onClick={() => toggleStyle(style.id)} />
                      ))}
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
                    <span>{generateError}{generateError.includes('Kredit') && <button onClick={() => setShowBuyModal(true)} className="ml-2 underline text-yellow-400 font-semibold">Top Up Kredit →</button>}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-4 rounded-lg text-lg hover:from-yellow-400 hover:to-purple-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? 'Menghasilkan...'
                    : promptMode === 'urai'
                      ? '✂️ Urai Skrip Jadi Prompt'
                      : promptMode === 'rapi' && rapiSubMode === 'dengan-text'
                        ? '✨ Hasilkan Prompt + Text Overlay'
                        : '✨ Hasilkan Prompt'}
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
                  <h2 className="text-2xl font-semibold text-yellow-400">
                    {promptMode === 'rapi' && rapiSubMode === 'dengan-text' ? '✨ Hasil Prompt + Text' : '🚀 Hasil Prompt'}
                  </h2>
                  {prompts.length > 0 && (
                    <button onClick={downloadPrompts} className="flex items-center gap-2 text-sm bg-purple-700 text-zinc-300 px-3 py-1.5 rounded-md hover:bg-purple-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download All
                    </button>
                  )}
                </div>

                {/* Dengan Text legend */}
                {promptMode === 'rapi' && rapiSubMode === 'dengan-text' && prompts.length === 0 && !isLoading && (
                  <div className="bg-green-900/10 border border-green-700/40 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-green-400 mb-2">📋 Format output yang akan dihasilkan:</p>
                    <div className="flex flex-col gap-1 text-xs text-zinc-500">
                      <p>• <span className="text-zinc-300">Deskripsi visual produk</span> — detail dari hasil riset</p>
                      <p>• <span className="text-zinc-300">Latar belakang</span> — suasana & pencahayaan</p>
                      <p>• <span className="text-zinc-300">Gaya Video + SFX</span> — style & efek suara spesifik</p>
                      <p>• <span className="text-zinc-300">Alur Video</span> — scene by scene</p>
                      <p>• <span className="text-zinc-300">Skrip time-coded</span> — HOOK / BODY / CTA + text overlay</p>
                    </div>
                  </div>
                )}

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
                    const segments = extractSegments(prompt);
                    // Word count validation only for rapi tanpa-text and urai
                    const showWordCnt = (promptMode === 'rapi' && rapiSubMode === 'tanpa-text') || promptMode === 'urai';
                    const wordCounts = showWordCnt ? getSegmentWordCounts(prompt, segmentDuration, promptMode === 'urai') : [];
                    const hasWarning = (promptWarnings[index]?.length ?? 0) > 0;

                    return (
                      <div key={index} className="flex flex-col gap-3">
                        <div className="relative group">
                          <Textarea id={`prompt-${index}`} value={prompt} onChange={e => handlePromptChange(e.target.value, index)} className="h-48" />
                          <div className="absolute top-3 right-3 flex gap-1.5">
                            <button
                              onClick={() => {
                                const start = prompt.indexOf('▶ SEGMEN');
                                const content = start !== -1 ? prompt.substring(start) : prompt;
                                const blob = new Blob([content], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = `sora-prompt-konten-${index + 1}.txt`;
                                document.body.appendChild(a); a.click();
                                document.body.removeChild(a); URL.revokeObjectURL(url);
                              }}
                              className="bg-gray-700/90 text-zinc-300 px-2.5 py-1.5 rounded-md text-xs hover:bg-gray-600 font-semibold flex items-center gap-1"
                              title={`Download konten #${index + 1}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              #{index + 1}
                            </button>
                            <button onClick={() => copyPrompt(prompt, index)} className="bg-purple-700/80 text-white px-3 py-1.5 rounded-md text-xs hover:bg-purple-600 font-semibold">
                              {copiedIndex === index ? '✓ Tersalin!' : 'Salin Semua'}
                            </button>
                          </div>
                        </div>

                        {showWordCnt && wordCounts.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-1">
                            {wordCounts.map((wc, wi) => {
                              const isOver = wc.count > wc.max;
                              return (
                                <span key={wi} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isOver ? 'bg-red-900/40 border-red-600 text-red-300' : 'bg-green-900/30 border-green-700/60 text-green-300'}`}>
                                  {isOver ? '⚠️' : '✓'} Seg {wi + 1}: {wc.count}/{wc.max} kata
                                </span>
                              );
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
                              const key = `${index}-${segIdx}`;
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

                  {/* Segmen Lanjutan */}
                  {promptMode === 'bebas' && prompts.length > 0 && (() => {
                    const visualDetail = visualRefs[0] || nameDesc || '[PRODUK/TEMPAT]';
                    const lanjutanText = `Lanjutkan video sebelumnya secara natural kurang dari ${segmentDuration} detik. Akhir Dialog: "klik tag lokasi bawah untuk detailnya ya." MULTI SCENE. NO TEXT. NO MUSIC. No cut-off dialogue. CLEAR SUBJECT LOCK. ANTI BLUR. Pertahankan konsistensi warna, pencahayaan, dan suasana dari video sebelumnya. Semua visual HANYA menampilkan ${visualDetail}.`;
                    return (
                      <div className="flex flex-col gap-3 border-t border-purple-700 pt-6 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-yellow-400">▶ SEGMEN LANJUTAN (Extend Sora)</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Untuk memperpanjang video di Sora</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(lanjutanText); setCopiedLanjutan(true); setTimeout(() => setCopiedLanjutan(false), 2000); }}
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

// ── Sub-komponen ──────────────────────────────────────────────────────────

function ModeSelector({ promptMode, setPromptMode, modeAllowed }: { promptMode: string; setPromptMode: (m: PromptModeKey) => void; modeAllowed: (m: PromptModeKey) => boolean }) {
  const modes = [
    { id: 'bebas' as PromptModeKey, label: 'Bebas', badge: 'TikTok GO' },
    { id: 'rapi' as PromptModeKey, label: 'Rapi', badge: 'TikTok GO + Universal' },
    { id: 'urai' as PromptModeKey, label: 'Urai Skrip', badge: 'Universal' },
    { id: 'skrip-jualan' as PromptModeKey, label: 'Skrip Jualan', badge: 'Produk Affiliate' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {modes.map(({ id, label, badge }) => {
        const allowed = modeAllowed(id);
        const active = promptMode === id;
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

// ── NEW: Sub-mode selector untuk Mode Rapi ───────────────────────────────
function RapiSubModeSelector({ value, onChange }: { value: string; onChange: (v: RapiSubModeKey) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-purple-300">📝 Format Prompt</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange('tanpa-text')}
          className={`flex flex-col gap-1.5 text-left px-4 py-3 rounded-lg border transition-all ${value === 'tanpa-text' ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}
        >
          <span className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${value === 'tanpa-text' ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
            <span className="text-sm font-bold">🎬 Tanpa Text</span>
          </span>
          <span className="text-xs text-zinc-500 ml-5">Prompt adegan visual murni & sinematik</span>
        </button>
        <button
          onClick={() => onChange('dengan-text')}
          className={`flex flex-col gap-1.5 text-left px-4 py-3 rounded-lg border transition-all ${value === 'dengan-text' ? 'bg-green-800/40 border-green-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-green-600 hover:text-zinc-200'}`}
        >
          <span className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${value === 'dengan-text' ? 'border-green-400 bg-green-400' : 'border-gray-500'}`} />
            <span className="text-sm font-bold">✨ Dengan Text</span>
          </span>
          <span className="text-xs text-zinc-500 ml-5">TikTok style: subtitle, promo text, SFX</span>
        </button>
      </div>
    </div>
  );
}

// ── NEW: CTA Type selector ────────────────────────────────────────────────
function CtaTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-purple-300">🎯 Tipe CTA</p>
      <div className="grid grid-cols-1 gap-2">
        {ctaTypeOptions.map(opt => (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${value === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}>
            <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 ${value === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs text-zinc-500">{opt.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── NEW: Scene preview for "Dengan Text" sub-mode ────────────────────────
function DenganTextScenePreview({ segmentDuration }: { segmentDuration: string }) {
  const is10s = segmentDuration === '10';

  const sections = is10s
    ? [
        { label: 'HOOK', time: '0–2 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-yellow-800/40 border-yellow-600 text-yellow-200', textIcon: '🔥' },
        { label: 'BODY 1', time: '2–5 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-blue-800/40 border-blue-600 text-blue-200', textIcon: '📝' },
        { label: 'CTA', time: '5–8 dtk', type: 'on-screen', icon: '🎭', color: 'bg-purple-800/50 border-purple-400 text-purple-200', textIcon: '📍' },
        { label: 'PENUTUP', time: '8–10 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-gray-700/50 border-gray-500 text-zinc-300', textIcon: '🎬' },
      ]
    : [
        { label: 'HOOK', time: '0–3 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-yellow-800/40 border-yellow-600 text-yellow-200', textIcon: '🔥' },
        { label: 'BODY 1', time: '3–7 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-blue-800/40 border-blue-600 text-blue-200', textIcon: '📝' },
        { label: 'BODY 2', time: '7–10 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-blue-800/40 border-blue-600 text-blue-200', textIcon: '📝' },
        { label: 'CTA', time: '10–13 dtk', type: 'on-screen', icon: '🎭', color: 'bg-purple-800/50 border-purple-400 text-purple-200', textIcon: '📍' },
        { label: 'PENUTUP', time: '13–15 dtk', type: 'voice-over', icon: '🎙️', color: 'bg-gray-700/50 border-gray-500 text-zinc-300', textIcon: '🎬' },
      ];

  return (
    <div className="bg-gray-900/60 border border-green-800/60 rounded-lg px-4 py-3">
      <p className="text-xs font-semibold text-green-400 mb-3">
        📋 Pola skrip per segmen ({segmentDuration} detik):
      </p>
      <div className="flex flex-wrap gap-2">
        {sections.map((sec) => (
          <div key={sec.label} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium ${sec.color}`}>
            <span className="font-bold text-xs">{sec.label}</span>
            <span>{sec.icon}</span>
            <span className="text-zinc-400 text-[10px]">{sec.time}</span>
            <span title="Text overlay">{sec.textIcon}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span>🎙️ = Voice over (karakter tidak terlihat)</span>
        <span>🎭 = On-screen (karakter tampak)</span>
        <span>📝/🔥/📍 = Text overlay</span>
      </div>
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
