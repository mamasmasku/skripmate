import { HOOKS } from './banks/hookBank';
import { STORYTELLING_RUMUS } from './banks/storytellingBank';
import { buildLaranganPrompt } from './banks/laranganBank';
import { CTA_CATEGORIES } from './banks/ctaBank';
import { SkripJualanConfig, ProductDisplayType } from './types';

// ── Shared Sora utilities ──────────────────────────────────────────────────
const INDONESIAN_CONTEXT_RULE = `**ATURAN KONTEKS VISUAL INDONESIA — WAJIB DI SEMUA ADEGAN:**
Semua elemen visual HARUS spesifik Indonesia. Jangan gunakan default Western.
- UANG: tulis "uang kertas Rupiah Indonesia", "lembaran Rupiah pecahan 100 ribu warna merah" — JANGAN hanya "uang" atau "cash"
- MAKANAN: sebut nama Indonesia secara eksplisit (nasi goreng, ayam geprek, es teh manis, dll)
- TEMPAT LOKAL: tambahkan "suasana warung/kafe Indonesia modern"
- BRAND INTERNASIONAL (KFC, Starbucks, dll): gunakan visual identity brand apa adanya — JANGAN tambahkan kata "Indonesia"
- ORANG DI LATAR: tambahkan "pengunjung berkulit sawo matang, orang Indonesia" — JANGAN ubah deskripsi karakter utama
- TEKS DI FRAME: tambahkan "bertuliskan huruf Latin bahasa Indonesia"`;

const buildCharacterRule = (appearanceId: string, totalScenes: number): string => {
  const isOnScreen = (n: number, isLast = false): boolean => {
    switch (appearanceId) {
      case 'adegan-1-saja': return n === 1;
      case 'adegan-1-dan-penutup': return n === 1 || (n === totalScenes && isLast);
      case 'adegan-1-2-dan-penutup': return n <= 2 || (n === totalScenes && isLast);
      default: return n <= 2;
    }
  };
  const onScreenList  = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => isOnScreen(n));
  const offScreenList = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => !isOnScreen(n));
  const onScreenText  = onScreenList.length  > 0 ? `adegan ${onScreenList.join(', ')} (dan adegan penutup segmen terakhir bila berlaku)` : '-';
  const offScreenText = offScreenList.length > 0 ? `adegan ${offScreenList.join(', ')}` : '-';

  return `**ATURAN KEMUNCULAN KARAKTER ON-SCREEN — KERAS:**
Karakter HANYA BOLEH TERLIHAT DI LAYAR pada: ${onScreenText}.
Pada adegan lainnya (${offScreenText}): karakter TIDAK BOLEH terlihat — visual 100% fokus produk/suasana/detail.
On-screen = karakter terlihat (wajah/tubuh). Voice over = suara terdengar tanpa karakter terlihat.
Adegan tanpa karakter on-screen TETAP BISA memiliki dialog voice over.`;
};

const buildDialogRule = (
  strategyId: string,
  appearanceId: string,
  segmentDuration: string,
  maxWords: number,
  totalScenes: number
): string => {
  const isOnScreen = (n: number): boolean => {
    switch (appearanceId) {
      case 'adegan-1-saja': return n === 1;
      case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes;
      case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes;
      default: return n <= 2;
    }
  };

  if (strategyId === 'voice-over-penuh') {
    const wps = Math.floor(maxWords / totalScenes);
    return `**ATURAN DIALOG — VOICE OVER PENUH:**
SEMUA adegan 1–${totalScenes} WAJIB memiliki dialog. Tidak ada adegan tanpa dialog.
Total dialog per segmen: ≤ ${maxWords} kata. Rata-rata ~${wps} kata per adegan.
Adegan on-screen: sedikit lebih panjang. Adegan off-screen: narasi pendek mendampingi visual.`;
  }

  const onScreenNums  = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => isOnScreen(n));
  const offScreenNums = Array.from({ length: totalScenes }, (_, i) => i + 1).filter(n => !isOnScreen(n));
  return `**ATURAN DIALOG — HANYA SAAT KARAKTER ON-SCREEN:**
Dialog HANYA ADA di adegan: ${onScreenNums.join(', ')}.
Adegan ${offScreenNums.join(', ')} WAJIB Dialog: "" (tanda kutip kosong — JANGAN dihapus).
Total dialog per segmen: ≤ ${maxWords} kata.`;
};

// ── Product display helpers ────────────────────────────────────────────────
const getProductDisplayHeader = (
  displayType: ProductDisplayType,
  character: string,
  segmentDuration: string
): string => {
  const char = character || 'faceless';
  const descriptions: Record<ProductDisplayType, string> = {
    'dipegang':  `${char} memegang produk dengan kedua tangan ke arah kamera, memperlihatkan kemasan dan tampilan produk secara jelas`,
    'dikenakan': `${char} mengenakan/memakai produk langsung di badan, memperlihatkan tampilan dari berbagai sudut dengan penuh percaya diri`,
    'digunakan': `${char} sedang menggunakan/mempraktikkan produk secara langsung, memperlihatkan cara kerja dan hasil nyata produk`,
    'ditunjuk':  `${char} menunjuk dan memperlihatkan produk yang terdisplay, sesekali mendekatkan kamera ke produk untuk detail lebih jelas`,
  };
  return `Buatkan video realistic ${descriptions[displayType]}, Durasi ${segmentDuration} detik, MULTI SCENE, NO TEXT, NO MUSIC, CLEAR SUBJECT LOCK, ANTI BLUR VIDEO. Tiap adegan ~2 detik. Ultra HD 4K. REAL VIDEO ONLY setiap adegan WAJIB menampilkan gerakan nyata. DILARANG slideshow atau foto diam yang hanya di-pan/zoom kameranya.`;
};

const getProductVisualRule = (displayType: ProductDisplayType): string => {
  const rules: Record<ProductDisplayType, string> = {
    'dipegang': `
ATURAN VISUAL — PRODUK DIPEGANG:
- Adegan on-screen: karakter memegang produk dengan kedua tangan ke arah kamera, ekspresi antusias dan natural
  Shot: medium shot karakter + produk terlihat jelas di tangan, latar belakang tidak terlalu ramai
- Adegan off-screen (VO): fokus ke produk tanpa karakter
  Prioritaskan: close-up kemasan/label produk dari berbagai sudut, detail tekstur/warna produk,
  medium shot produk di atas permukaan bersih, close-up fitur unik produk`,
    'dikenakan': `
ATURAN VISUAL — PRODUK DIKENAKAN/DIPAKAI:
- Adegan on-screen: karakter memperlihatkan produk yang sedang dikenakan, full body atau medium shot
  Shot: full body shot tampilan keseluruhan, medium shot bagian produk yang dikenakan, karakter berputar/bergerak natural
- Adegan off-screen (VO): fokus ke detail produk tanpa karakter
  Prioritaskan: close-up tekstur/material produk, detail jahitan/aksesoris/finishing,
  medium shot produk terlipat/tergantung dengan rapi, wide shot tampilan produk dari kejauhan`,
    'digunakan': `
ATURAN VISUAL — PRODUK SEDANG DIGUNAKAN:
- Adegan on-screen: karakter sedang mempraktikkan/menggunakan produk secara aktif
  Shot: medium shot karakter + produk dalam aksi, ekspresi menunjukkan hasil/manfaat produk
- Adegan off-screen (VO): fokus ke proses dan hasil penggunaan produk
  Prioritaskan: close-up proses penggunaan produk (tangan/area terkait), detail hasil setelah digunakan,
  medium shot produk dalam kondisi digunakan, close-up fitur yang sedang aktif bekerja`,
    'ditunjuk': `
ATURAN VISUAL — PRODUK DITUNJUK/DIPAMERKAN:
- Adegan on-screen: karakter menunjuk produk sambil menjelaskan, gestur tangan ke arah produk
  Shot: medium shot karakter + produk di frame yang sama, karakter sesekali menyentuh/mengarahkan ke produk
- Adegan off-screen (VO): fokus ke display produk tanpa karakter
  Prioritaskan: wide shot display produk lengkap dari depan, medium shot detail bagian produk,
  close-up label/harga/fitur penting, berbagai sudut pandang produk yang terdisplay`,
  };
  return rules[displayType];
};

// ─────────────────────────────────────────────────────────────────────────────
// Client-side randomizer — Fisher-Yates shuffle, tidak mutate array asli
// ─────────────────────────────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/**
 * Ambil `count` item secara acak dari array.
 * Jika count > panjang array, re-shuffle dan lanjutkan (tidak mengulang urutan yang sama).
 */
function pickRandom<T>(arr: T[], count: number): T[] {
  const result: T[] = [];
  while (result.length < count) {
    const shuffled = shuffleArray(arr);
    result.push(...shuffled.slice(0, Math.min(count - result.length, shuffled.length)));
  }
  return result;
}

// ── Build system prompt ────────────────────────────────────────────────────
export const buildSkripJualanSystemPrompt = (config: SkripJualanConfig): string => {
  const {
    selectedRumus,
    selectedCTACategory,
    soraEnabled,
    soraCharacter,
    soraSegmentDuration,
    soraCharacterAppearance,
    soraDialogStrategy,
    productDisplayType,
  } = config;

  // Rumus bank — dikirim sebagai referensi detail cara penulisan saja
  const availableRumus = selectedRumus.length > 0
    ? STORYTELLING_RUMUS.filter(r => selectedRumus.includes(r.id))
    : STORYTELLING_RUMUS;

  const rumusBankStr = availableRumus.map(r =>
    `**${r.name}**\n${r.description}\nStruktur: ${r.structure}`
  ).join('\n\n');

  // CTA
  const ctaCategory   = CTA_CATEGORIES.find(c => c.id === selectedCTACategory) ?? CTA_CATEGORIES[0];
  const ctaOptionsStr = ctaCategory.options.map(o => `- "${o.text}"`).join('\n');
  const ctaInstruction = `Gunakan CTA kategori "${ctaCategory.label}". Pilih SALAH SATU dari opsi berikut (boleh dikreasikan ulang selama inti pesannya sama):\n${ctaOptionsStr}`;

  // Larangan
  const laranganStr = buildLaranganPrompt();

  // Sora
  const totalSoraScenes = soraSegmentDuration === '10' ? 5 : 7;
  const maxWords        = soraSegmentDuration === '10' ? 28 : 40;

  const soraInstruction = soraEnabled ? `

===INSTRUKSI SORA (WAJIB JIKA TOGGLE AKTIF)===

Setelah membuat skrip lengkap, urai skrip tersebut menjadi prompt video Sora. Bertindaklah sebagai sutradara:
1. Hitung jumlah segmen berdasarkan durasi skrip ÷ ${soraSegmentDuration} detik per segmen
2. Bagi dialog dari skrip ke adegan (~2 detik per adegan, ${totalSoraScenes} adegan per segmen)
3. Rancang visual sinematik per adegan sesuai tipe tampilan produk di bawah
4. Ikuti aturan karakter dan dialog Sora di bawah

Karakter Sora: ${soraCharacter || 'faceless'}

${buildCharacterRule(soraCharacterAppearance, totalSoraScenes)}

${buildDialogRule(soraDialogStrategy, soraCharacterAppearance, soraSegmentDuration, maxWords, totalSoraScenes)}

${getProductVisualRule(productDisplayType)}

${INDONESIAN_CONTEXT_RULE}

KOMPOSISI SHOT — ATURAN KETAT:
- DOMINASI wide shot dan medium shot — minimal ${totalSoraScenes === 5 ? '4' : '5'} dari ${totalSoraScenes} adegan harus wide atau medium
- Close-up MAKSIMAL 1 kali per segmen, hanya untuk detail paling impactful
- DILARANG close-up yang memotong konteks dari frame
- DILARANG adegan off-screen diisi deskripsi karakter dalam bentuk apapun

LARANGAN VISUAL PLATFORM LAIN — WAJIB:
- DILARANG menampilkan layar HP yang menunjukkan aplikasi order atau belanja apapun
- DILARANG menampilkan UI aplikasi, notifikasi order, atau struk digital dari platform lain
- DILARANG visual tangan mengetuk layar HP yang menampilkan platform lain
- Jika perlu menunjukkan "cara beli/order", gunakan: karakter menunjuk ke bawah frame, gestur tangan natural, atau karakter bicara langsung ke kamera — TANPA memperlihatkan layar HP

FORMAT SORA:
▶ SEGMEN [N] (${soraSegmentDuration} detik)
${getProductDisplayHeader(productDisplayType, soraCharacter, soraSegmentDuration)}

[deskripsi visual langsung tanpa label], Dialog: "dialog 1"
[deskripsi visual langsung tanpa label], Dialog: "dialog 2"
[lanjutkan untuk semua ${totalSoraScenes} adegan]

--

[segmen berikutnya jika ada]

ATURAN PENULISAN ADEGAN — WAJIB:
- DILARANG menulis "Deskripsi visual adegan 1:", "Adegan 1:", atau label apapun sebelum deskripsi
- Langsung tulis deskripsi visual sinematik
- Setiap baris adegan harus dimulai langsung dengan deskripsi sinematik tanpa label apapun
` : '';

  return `Kamu adalah AI Copywriter & Scriptwriter TikTok dalam Bahasa Indonesia. Tugasmu adalah membuat skrip konten jualan/promosi produk yang natural, engaging, dan AMAN sesuai panduan platform.

===BANK HOOK — KOMPONEN X, Y, Z===

Setiap hook menggunakan template dengan komponen:
- X = Nama produk atau fitur utama
- Y = Ekspektasi, masalah, atau ketakutan
- Z = Kondisi, target audience, atau fakta pendukung

Isi X, Y, Z berdasarkan produk yang diberikan user. Boleh kreasikan kalimatnya agar nyambung dengan rumus storytelling, namun inti pesan template HARUS terjaga.

ATURAN HOOK — SANGAT PENTING:
- Hook per skrip SUDAH DITENTUKAN di bagian "ASSIGNMENT HOOK" dalam user prompt
- Gunakan hook yang ditugaskan PERSIS sesuai nomor — JANGAN pilih hook lain
- Isi komponen X/Y/Z sesuai produk, tapi nomor dan template TIDAK BOLEH diganti
- Cantumkan nomor hook yang digunakan di baris ℹ️ pada output

===REFERENSI RUMUS STORYTELLING===

Rumus per skrip SUDAH DITENTUKAN di bagian "ASSIGNMENT RUMUS" dalam user prompt.
Gunakan rumus yang ditugaskan persis sesuai nama — JANGAN pilih rumus lain.
Cantumkan nama rumus yang ditugaskan di baris ℹ️ pada output.

Detail setiap rumus untuk referensi cara penulisan:

${rumusBankStr}

ATURAN PENTING:
- SETIAP SKRIP hanya boleh menggunakan 1 rumus sesuai assignment
- DILARANG menggabungkan beberapa rumus dalam 1 skrip

===ATURAN KALIMAT AMAN===

${laranganStr}

===INSTRUKSI CTA===

${ctaInstruction}

===FORMAT OUTPUT WAJIB===

KONSEP PENTING: Skrip ditulis sebagai SATU PARAGRAF MENGALIR dari hook sampai CTA.
Struktur (Hook → Story → Produk → Bukti → CTA) adalah PANDUAN ALUR, bukan label terpisah.
Hasilnya adalah narasi mulus seperti orang bicara di TikTok — tidak ada judul section, tidak ada pemisah.

PANDUAN PANJANG SKRIP BERDASARKAN DURASI:
- 10 detik = ±25 kata
- 15 detik = ±40 kata
- 20 detik = ±55 kata
- 30 detik = ±80 kata
- 45 detik = ±120 kata
- 60 detik = ±160 kata
- 90 detik = ±240 kata
Sesuaikan panjang skrip agar pas dengan durasi yang diminta. Jangan terlalu pendek atau terlalu panjang.

Gunakan format PERSIS seperti ini:

===SKRIP 1===
ℹ️ Hook #42 | Rumus: Before - After - Bridge

📜 SKRIP:
Tulis seluruh skrip di sini sebagai satu paragraf mengalir dari hook sampai CTA. Kalimat sambung menyambung natural seperti orang bicara, tidak ada jeda atau label section di tengah-tengah.

📝 CAPTION:
Tulis caption TikTok 2-3 kalimat dengan emoji yang relevan.

#️⃣ HASHTAG:
#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5
- WAJIB tulis tepat 5 hashtag per skrip — TIDAK BOLEH dilewati
- Format hashtag: satu baris, dipisah spasi, semua huruf kecil tanpa spasi dalam hashtag
- DILARANG mengosongkan bagian #️⃣ HASHTAG:
${soraEnabled ? `
🎬 PROMPT SORA:
Tulis breakdown prompt Sora di sini sesuai instruksi.
` : ''}
===END SKRIP 1===

ATURAN FORMAT TAMBAHAN:
- Ganti angka "1" di ===SKRIP 1=== dan ===END SKRIP 1=== sesuai nomor urut skrip
- LANGSUNG mulai output dengan ===SKRIP 1=== tanpa penjelasan apapun
- DILARANG memisahkan skrip menjadi bagian-bagian berlabel (🎣 HOOK:, 📖 STORY:, dsb.)
- DILARANG menulis placeholder, tanda kurung siku, atau instruksi dalam isi skrip
- DILARANG ada komentar, intro, atau penutup di luar format
- Skrip WAJIB panjangnya sesuai durasi yang diminta
${soraInstruction}`;
};

// ── Build user prompt ──────────────────────────────────────────────────────
export const buildSkripJualanUserPrompt = (config: SkripJualanConfig): string => {
  const {
    namaProduk,
    durasiSkrip,
    tone,
    jumlahSkrip,
    manualHook,
    selectedRumus,
    productDisplayType,
  } = config;

  const displayTypeLabel: Record<string, string> = {
    'dipegang':  'Dipegang ke kamera',
    'dikenakan': 'Dikenakan/Dipakai langsung',
    'digunakan': 'Sedang digunakan/dipraktikkan',
    'ditunjuk':  'Ditunjuk/Dipamerkan',
  };

  // ── Hook assignment (client-side random) ──────────────────────────────
  let hookAssignment: string;

  if (manualHook.trim()) {
    hookAssignment = `HOOK — MANUAL (WAJIB DIGUNAKAN UNTUK SEMUA SKRIP, JANGAN ambil dari bank hook):
"${manualHook.trim()}"
Cantumkan "Manual" sebagai nomor hook di baris ℹ️.`;
  } else {
    const assignedHooks = pickRandom(HOOKS, jumlahSkrip);
    const lines = assignedHooks
      .map((h, i) => `- Skrip ${i + 1}: Hook #${h.id} → template: "${h.template}"`)
      .join('\n');

    hookAssignment = `ASSIGNMENT HOOK — WAJIB DIIKUTI PERSIS:
Hook setiap skrip sudah ditentukan di bawah. Gunakan persis nomor & template yang ditugaskan.
Isi X/Y/Z berdasarkan produk — JANGAN ganti ke hook lain.

${lines}

Cantumkan nomor hook yang ditugaskan di baris ℹ️ output.`;
  }

  // ── Rumus assignment (client-side random) ─────────────────────────────
  const availableRumus = selectedRumus.length > 0
    ? STORYTELLING_RUMUS.filter(r => selectedRumus.includes(r.id))
    : STORYTELLING_RUMUS;

  const assignedRumus = pickRandom(availableRumus, jumlahSkrip);
  const rumusLines = assignedRumus
    .map((r, i) => `- Skrip ${i + 1}: ${r.name}`)
    .join('\n');

  const rumusAssignment = `ASSIGNMENT RUMUS — WAJIB DIIKUTI PERSIS:
Rumus setiap skrip sudah ditentukan di bawah. Gunakan persis rumus yang ditugaskan — JANGAN pilih rumus lain.

${rumusLines}

Cantumkan nama rumus yang ditugaskan di baris ℹ️ output.`;

  return `Buat ${jumlahSkrip} skrip konten TikTok untuk produk berikut:

Nama & Deskripsi Produk: ${namaProduk}
Durasi Skrip: ${durasiSkrip} detik
Tone: ${tone}
Jumlah Skrip: ${jumlahSkrip}
Cara Tampil Produk: ${displayTypeLabel[productDisplayType] || 'Dipegang ke kamera'}

${hookAssignment}

${rumusAssignment}

Pastikan:
- Setiap skrip menggunakan hook PERSIS sesuai assignment di atas
- Setiap skrip menggunakan rumus PERSIS sesuai assignment di atas
- Semua kalimat mematuhi aturan larangan/kata aman
- Caption dan 5 hashtag per skrip
- Visual Sora disesuaikan dengan cara tampil produk: ${displayTypeLabel[productDisplayType] || 'Dipegang ke kamera'}
- Format output PERSIS sesuai instruksi`;
};
