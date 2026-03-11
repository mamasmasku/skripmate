import { AuthUser } from '../hooks/useAuth';

interface Props {
  user:          AuthUser;
  onBuyCredits:  () => void;
  onChangePw:    () => void;
  onAdminPanel?: () => void;
  onLogout:      () => void;
}

export default function CreditDisplay({ user, onBuyCredits, onChangePw, onAdminPanel, onLogout }: Props) {
  const isPro   = user.role === 'pro'   || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  const creditColor =
    user.credits === 0  ? 'text-red-400 border-red-700/60 bg-red-900/20' :
    user.credits < 10   ? 'text-yellow-400 border-yellow-700/60 bg-yellow-900/20' :
                          'text-green-400 border-green-700/60 bg-green-900/20';

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">

      {/* Badge role */}
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
        isAdmin ? 'bg-yellow-900/40 border-yellow-500/60 text-yellow-300' :
        isPro   ? 'bg-purple-900/40 border-purple-500/60 text-purple-300' :
                  'bg-gray-800 border-gray-600 text-zinc-500'
      }`}>
        {isAdmin ? '👑 Admin' : isPro ? '⭐ Pro' : '🆓 Free'}
      </span>

      {/* Kredit (hanya pro/admin) */}
      {isPro && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${creditColor}`}>
          💎 {user.credits} kredit
        </span>
      )}

      {/* Tombol beli kredit */}
      {isPro && (
        <button
          onClick={onBuyCredits}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-500 text-gray-900 hover:bg-yellow-400 transition-all"
        >
          + Top Up
        </button>
      )}

      {/* Nama user + menu */}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-zinc-400 hidden sm:inline">{user.username}</span>

        {isAdmin && onAdminPanel && (
          <button
            onClick={onAdminPanel}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-900/40 border border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/60 transition-all"
            title="Panel Admin"
          >
            ⚙️
          </button>
        )}

        <button
          onClick={onChangePw}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-700/60 border border-gray-600 text-zinc-400 hover:text-white hover:bg-gray-700 transition-all"
          title="Ganti Password"
        >
          🔒
        </button>

        <button
          onClick={onLogout}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-700/50 text-red-400 hover:bg-red-900/50 transition-all"
          title="Logout"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
