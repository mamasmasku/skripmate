import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CreditPackage {
  id:      string;
  credits: number;
  price:   number;
  label:   string;
  bonus:   string;
}

interface Props {
  token:          string;
  currentCredits: number;
  onClose:        () => void;
  onSuccess:      (newCredits: number) => void;
}

// Load Midtrans Snap script once
function loadSnapScript(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).snap) { resolve(); return; }
    const isProd = false; // ganti ke true untuk production
    const script = document.createElement('script');
    script.src = isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? '');
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export default function BuyCreditsModal({ token, currentCredits, onClose, onSuccess }: Props) {
  const [packages,    setPackages]    = useState<CreditPackage[]>([]);
  const [selected,    setSelected]    = useState<string>('pack_120');
  const [isLoading,   setIsLoading]   = useState(false);
  const [isLoadingPkg,setIsLoadingPkg]= useState(true);
  const [statusMsg,   setStatusMsg]   = useState('');
  const [pendingOrder,setPendingOrder]= useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payment')
      .then(r => r.json())
      .then(d => { setPackages(d.packages ?? []); setIsLoadingPkg(false); });
  }, []);

  // Poll status setelah snap ditutup
  useEffect(() => {
    if (!pendingOrder) return;
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      const res = await fetch('/api/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ action: 'check-status', orderId: pendingOrder }),
      });
      const data = await res.json();
      if (data.status === 'paid') {
        clearInterval(interval);
        setPendingOrder(null);
        setStatusMsg('');
        onSuccess(data.credits);
        onClose();
      } else if (tries >= 10) {
        clearInterval(interval);
        setPendingOrder(null);
        setStatusMsg('Pembayaran belum terverifikasi. Kredit akan ditambahkan otomatis setelah konfirmasi.');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingOrder, token, onSuccess, onClose]);

  const handleBuy = async () => {
    if (!selected) return;
    setIsLoading(true);
    setStatusMsg('');
    try {
      await loadSnapScript();

      const res = await fetch('/api/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ action: 'create', packageId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat transaksi');

      const { snapToken, orderId } = data;

      (window as any).snap.pay(snapToken, {
        onSuccess: () => { setPendingOrder(orderId); setStatusMsg('Pembayaran berhasil! Memverifikasi...'); },
        onPending: () => { setStatusMsg('Menunggu pembayaran...'); },
        onError:   () => { setStatusMsg('Pembayaran gagal. Silakan coba lagi.'); },
        onClose:   () => {
          // User tutup popup — poll sebentar
          setPendingOrder(orderId);
          setStatusMsg('Memeriksa status pembayaran...');
        },
      });
    } catch (e: any) {
      setStatusMsg(`❌ ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selected);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-gray-800 border border-purple-700/60 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-yellow-400">💎 Top Up Kredit</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Kredit saat ini: <span className="text-zinc-300 font-semibold">{currentCredits}</span></p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
          </div>

          {/* Packages */}
          {isLoadingPkg ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    selected === pkg.id
                      ? 'bg-purple-700/50 border-purple-400 text-white'
                      : 'bg-gray-900/50 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${selected === pkg.id ? 'bg-yellow-400 border-yellow-400' : 'border-gray-500'}`} />
                    <div className="text-left">
                      <p className="text-sm font-bold">{pkg.label}</p>
                      {pkg.bonus && <p className="text-xs text-green-400">{pkg.bonus}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-yellow-300">
                    Rp {pkg.price.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Info pembayaran */}
          <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-300 font-semibold mb-1">💳 Metode Pembayaran</p>
            <p className="text-xs text-zinc-400">QRIS · GoPay · OVO · Dana · Transfer Bank · Kartu Kredit</p>
            <p className="text-xs text-zinc-600 mt-1">Powered by Midtrans — pembayaran aman & terverifikasi</p>
          </div>

          {/* Status */}
          {statusMsg && (
            <div className={`text-xs rounded-lg px-4 py-2.5 ${
              statusMsg.includes('❌') ? 'bg-red-900/30 text-red-300 border border-red-700/50' : 'bg-yellow-900/20 text-yellow-300 border border-yellow-700/50'
            }`}>
              {statusMsg}
            </div>
          )}

          {/* Tombol bayar */}
          <button
            onClick={handleBuy}
            disabled={isLoading || !selected || isLoadingPkg}
            className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:from-yellow-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : selectedPkg ? `Bayar Rp ${selectedPkg.price.toLocaleString('id-ID')}` : 'Pilih Paket'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
