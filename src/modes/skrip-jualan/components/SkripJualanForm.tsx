import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { STORYTELLING_RUMUS } from '../banks/storytellingBank';
import { CTA_CATEGORIES, DEFAULT_CTA_CATEGORY_ID } from '../banks/ctaBank';
import { SkripJualanConfig, ProductDisplayType } from '../types';

const characterAppearanceOptions = [
  { id: 'adegan-1-2', label: 'Adegan 1 & 2', description: 'Karakter on-screen di 2 adegan pertama tiap segmen' },
  { id: 'adegan-1-saja', label: 'Adegan 1 saja', description: 'Karakter on-screen hanya di adegan pembuka tiap segmen' },
  { id: 'adegan-1-dan-penutup', label: 'Adegan 1 & penutup', description: 'On-screen di adegan 1 + adegan terakhir segmen terakhir' },
  { id: 'adegan-1-2-dan-penutup', label: 'Adegan 1, 2 & penutup', description: 'On-screen di adegan 1 & 2 + adegan terakhir segmen terakhir' },
];

const dialogStrategyOptions = [
  { id: 'voice-over-penuh', label: 'Voice Over Penuh', description: 'Narasi berjalan di semua adegan sepanjang video' },
  { id: 'hanya-on-screen', label: 'Dialog Hanya Saat On-Screen', description: 'Dialog hanya ada saat karakter muncul di layar' },
];

const productDisplayOptions: { id: ProductDisplayType; emoji: string; label: string; description: string }[] = [
  {
    id: 'dipegang',
    emoji: '✋',
    label: 'Dipegang',
    description: 'Produk dipegang ke kamera — makanan, minuman, skincare, gadget, botol, kemasan',
  },
  {
    id: 'dikenakan',
    emoji: '👗',
    label: 'Dikenakan / Dipakai',
    description: 'Produk dipakai langsung di badan — baju, sepatu, aksesoris, hijab, jam tangan',
  },
  {
    id: 'digunakan',
    emoji: '🔧',
    label: 'Sedang Digunakan',
    description: 'Produk dipakai dalam aksi nyata — alat masak, peralatan rumah, tools, alat kecantikan',
  },
  {
    id: 'ditunjuk',
    emoji: '👆',
    label: 'Ditunjuk / Dipamerkan',
    description: 'Produk ditampilkan tanpa dipegang — display toko, produk besar, produk di meja/rak',
  },
];

const TONE_PRESETS = ['Santai', 'Serius', 'Emosional', 'Inspiratif', 'Humoris', 'Informatif'];

interface Props {
  onGenerate: (config: SkripJualanConfig) => void;
  isLoading: boolean;
}

export default function SkripJualanForm({ onGenerate, isLoading }: Props) {
  const [namaProduk, setNamaProduk] = useState('');
  const [durasiSkrip, setDurasiSkrip] = useState('45');
  const [tone, setTone] = useState('Santai');
  const [customTone, setCustomTone] = useState('');
  const [jumlahSkrip, setJumlahSkrip] = useState('1');
  const [manualHook, setManualHook] = useState('');
  const [selectedRumus, setSelectedRumus] = useState<string[]>([]);
  const [selectedCTACategory, setSelectedCTACategory] = useState(DEFAULT_CTA_CATEGORY_ID);
  const [productDisplayType, setProductDisplayType] = useState<ProductDisplayType>('dipegang');
  const [soraEnabled, setSoraEnabled] = useState(false);
  const [soraCharacter, setSoraCharacter] = useState('');
  const [soraSegmentDuration, setSoraSegmentDuration] = useState('15');
  const [soraCharacterAppearance, setSoraCharacterAppearance] = useState('adegan-1-2');
  const [soraDialogStrategy, setSoraDialogStrategy] = useState('voice-over-penuh');
  const [rumusExpanded, setRumusExpanded] = useState(false);

  const toggleRumus = (id: string) => {
    setSelectedRumus(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const finalTone = tone === 'custom' ? customTone : tone;

  const handleSubmit = () => {
    if (!namaProduk.trim()) return;
    onGenerate({
      namaProduk: namaProduk.trim(),
      durasiSkrip,
      tone: finalTone,
      jumlahSkrip: Math.max(1, parseInt(jumlahSkrip) || 1),
      manualHook: manualHook.trim(),
      selectedRumus,
      selectedCTACategory,
      productDisplayType,
      soraEnabled,
      soraCharacter: soraCharacter.trim(),
      soraSegmentDuration,
      soraCharacterAppearance,
      soraDialogStrategy,
    });
  };

  const isDisabled = isLoading || !namaProduk.trim() || (tone === 'custom' && !customTone.trim());

  return (
    <div className="flex flex-col gap-6">

      {/* ── Informasi Produk ── */}
      <div className="flex flex-col gap-5 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
        <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">📦 Informasi Produk</h2>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400">Nama & Deskripsi Produk <span className="text-red-400">*</span></label>
          <textarea
            value={namaProduk}
            onChange={e => setNamaProduk(e.target.value)}
            rows={3}
            placeholder="Contoh: Kemoceng teleskopik 2,8 meter — bisa dibongkar pasang, ringan, cocok untuk bersihin plafon tinggi tanpa tangga..."
            className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400">Durasi Skrip (detik)</label>
            <input
              type="number"
              value={durasiSkrip}
              onChange={e => setDurasiSkrip(e.target.value)}
              placeholder="Contoh: 45"
              className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400">Jumlah Skrip</label>
            <input
              type="number"
              min="1"
              max="10"
              value={jumlahSkrip}
              onChange={e => setJumlahSkrip(e.target.value)}
              className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Tone */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400">Tone / Gaya Bicara</label>
          <div className="flex flex-wrap gap-2">
            {TONE_PRESETS.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${tone === t ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-400 border-gray-600 hover:border-purple-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setTone('custom')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${tone === 'custom' ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-400 border-gray-600 hover:border-purple-500 hover:text-white'}`}
            >
              Custom...
            </button>
          </div>
          <AnimatePresence>
            {tone === 'custom' && (
              <motion.input
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                value={customTone}
                onChange={e => setCustomTone(e.target.value)}
                placeholder="Tulis tone kustom, contoh: formal, energik, ASMR..."
                className="bg-gray-900/60 border border-yellow-600/60 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Manual Hook */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400">
            Manual Hook
            <span className="ml-2 font-normal text-zinc-600">(opsional — kosongkan agar AI pilih dari bank hook)</span>
          </label>
          <input
            value={manualHook}
            onChange={e => setManualHook(e.target.value)}
            placeholder="Tulis hook sendiri di sini jika ingin menggunakan hook manual..."
            className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {manualHook.trim() && (
            <p className="text-xs text-yellow-400">⚡ Hook manual aktif — bank hook tidak akan digunakan</p>
          )}
        </div>
      </div>

      {/* ── Cara Tampil Produk ── */}
      <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
        <div>
          <h2 className="text-xl font-semibold text-yellow-400">🎥 Cara Tampil Produk</h2>
          <p className="text-xs text-zinc-500 mt-1">Pilih bagaimana produk ditampilkan dalam video — ini mempengaruhi deskripsi visual Sora</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {productDisplayOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setProductDisplayType(opt.id)}
              className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${
                productDisplayType === opt.id
                  ? 'bg-purple-700/50 border-purple-400 text-white'
                  : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'
              }`}
            >
              <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 transition-all ${
                productDisplayType === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'
              }`} />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold leading-tight">
                  {opt.emoji} {opt.label}
                </span>
                <span className="text-xs text-zinc-500 leading-snug">{opt.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Rumus Storytelling ── */}
      <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-yellow-400">📖 Rumus Storytelling</h2>
            <p className="text-xs text-zinc-500 mt-1">Pilih satu atau lebih. Kosongkan = AI memilih secara acak & bervariasi.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedRumus.length > 0 && (
              <span className="text-xs bg-purple-800/60 text-purple-200 px-2 py-1 rounded-full">{selectedRumus.length} dipilih</span>
            )}
            <button
              onClick={() => setRumusExpanded(!rumusExpanded)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600"
            >
              {rumusExpanded ? '▲ Tutup' : '▼ Lihat Semua'}
            </button>
          </div>
        </div>

        {selectedRumus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 bg-gray-900/40 rounded-lg px-3 py-2 border border-purple-800/40">
            {selectedRumus.map(id => {
              const r = STORYTELLING_RUMUS.find(x => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 text-xs bg-purple-700/60 text-purple-200 px-2.5 py-1 rounded-full">
                  {r?.name}
                  <button onClick={() => toggleRumus(id)} className="hover:text-red-300 transition-colors ml-0.5">×</button>
                </span>
              );
            })}
            <button onClick={() => setSelectedRumus([])} className="text-xs text-zinc-600 hover:text-red-400 transition-colors ml-1">hapus semua</button>
          </div>
        )}

        <AnimatePresence>
          {rumusExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1"
            >
              {STORYTELLING_RUMUS.map(r => (
                <button
                  key={r.id}
                  onClick={() => toggleRumus(r.id)}
                  className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${selectedRumus.includes(r.id) ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}
                >
                  <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded border-2 transition-all ${selectedRumus.includes(r.id) ? 'bg-yellow-400 border-yellow-400' : 'border-gray-500'}`} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold leading-tight">{r.name}</span>
                    <span className="text-xs text-zinc-500 leading-snug">{r.description}</span>
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!rumusExpanded && (
          <p className="text-xs text-zinc-600 italic">
            {selectedRumus.length === 0
              ? '✨ AI akan memilih & memvariasikan rumus secara otomatis'
              : `Distribusi ke ${jumlahSkrip} skrip: ${Array.from({ length: Math.min(parseInt(jumlahSkrip) || 1, 5) }, (_, i) => {
                  const r = STORYTELLING_RUMUS.find(x => x.id === selectedRumus[i % selectedRumus.length]);
                  return `#${i + 1} ${r?.name.split(' ')[0] ?? ''}`;
                }).join(', ')}${parseInt(jumlahSkrip) > 5 ? '...' : ''}`}
          </p>
        )}
      </div>

      {/* ── Pilihan CTA ── */}
      <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
        <h2 className="text-xl font-semibold text-yellow-400">🎯 Pilihan CTA</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CTA_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCTACategory(cat.id)}
              className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${selectedCTACategory === cat.id ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-400 border-gray-600 hover:border-purple-500 hover:text-white'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="bg-gray-900/40 border border-purple-800/40 rounded-lg px-3 py-2">
          <p className="text-xs text-zinc-500">Contoh CTA yang akan digunakan:</p>
          <p className="text-xs text-purple-300 mt-1 italic">
            "{CTA_CATEGORIES.find(c => c.id === selectedCTACategory)?.options[0].text}"
          </p>
        </div>
      </div>

      {/* ── Sora Toggle ── */}
      
      <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-yellow-400">🎬 Ubah ke Prompt Sora</h2>
            <p className="text-xs text-zinc-500 mt-1">Aktifkan untuk juga menghasilkan prompt video Sora dari setiap skrip, Namun tidak efektif untuk skrip durasi 30 detik ke bawah. Solusi buat skrip di sini lalu copy skrip dan masukan di mode urai skrip. AI di paksa mengikuti struktur sehingga untuk durasi pendek hasilnya lebih panjang dari target maksimal kata</p>
          </div>
          <button
            onClick={() => setSoraEnabled(!soraEnabled)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${soraEnabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${soraEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        <AnimatePresence>
          {soraEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 pt-4 border-t border-purple-800"
            >
              {/* Info cara tampil produk yang dipilih */}
              <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg px-3 py-2.5">
                <p className="text-xs text-zinc-500">Cara tampil produk di Sora:</p>
                <p className="text-sm font-semibold text-purple-300 mt-0.5">
                  {productDisplayOptions.find(o => o.id === productDisplayType)?.emoji}{' '}
                  {productDisplayOptions.find(o => o.id === productDisplayType)?.label}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5 italic">
                  Ubah di bagian "Cara Tampil Produk" di atas
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400">Karakter (kosongkan = faceless)</label>
                <input
                  value={soraCharacter}
                  onChange={e => setSoraCharacter(e.target.value)}
                  placeholder="Contoh: Wanita muda 25 tahun, rambut hitam panjang, gaya casual"
                  className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400">Durasi per Segmen</label>
                <div className="flex gap-3">
                  {['10', '15'].map(d => (
                    <button
                      key={d}
                      onClick={() => setSoraSegmentDuration(d)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${soraSegmentDuration === d ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-400 border-gray-600 hover:border-purple-500'}`}
                    >
                      {d} detik
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-purple-300">🎭 Karakter On-Screen</label>
                <div className="grid grid-cols-1 gap-2">
                  {characterAppearanceOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSoraCharacterAppearance(opt.id)}
                      className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${soraCharacterAppearance === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}
                    >
                      <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 transition-all ${soraCharacterAppearance === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs text-zinc-500">{opt.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-purple-300">🗣️ Strategi Dialog</label>
                <div className="grid grid-cols-1 gap-2">
                  {dialogStrategyOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSoraDialogStrategy(opt.id)}
                      className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${soraDialogStrategy === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}
                    >
                      <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 transition-all ${soraDialogStrategy === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs text-zinc-500">{opt.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div> 

      {/* ── Generate Button ── */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full bg-gradient-to-r from-green-500 to-purple-600 text-white font-bold py-4 rounded-lg text-lg hover:from-green-400 hover:to-purple-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Membuat Skrip...' : `🛒 Buat ${jumlahSkrip} Skrip Jualan`}
      </button>
    </div>
  );
}
