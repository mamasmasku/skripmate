import { useState } from 'react';
import { motion } from 'motion/react';

interface Props {
  onLogin:   (username: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  error:     string;
}

export default function LoginScreen({ onLogin, isLoading, error }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    await onLogin(username.trim(), password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500">
            ScriptMate
          </h1>
          <p className="text-purple-300 text-sm mt-1">AI Generator Skrip & Sora Prompt</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/60 border border-purple-700/60 rounded-2xl p-8 flex flex-col gap-5 shadow-xl">
          <h2 className="text-lg font-semibold text-zinc-200 text-center">Masuk ke Akun</h2>

          {/* Username */}
<input
  type="text"
  value={username}
  onChange={e => setUsername(e.target.value)}
  onKeyDown={e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('password-input')?.focus(); // ← pindah ke password
    }
  }}
  placeholder="Masukkan username kamu"
  autoComplete="username"
              className="bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Password */}
<input
  id="password-input" // ← tambahkan id
  type={showPw ? 'text' : 'password'}
  value={password}
  onChange={e => setPassword(e.target.value)}
  onKeyDown={e => {
    if (e.key === 'Enter') handleSubmit(); // ← submit di sini
  }}
  placeholder="Masukkan password"
  autoComplete="current-password"
                className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/30 border border-red-600/50 text-red-300 text-xs rounded-lg px-4 py-2.5"
            >
              ❌ {error}
            </motion.div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !username.trim() || !password}
            className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Masuk...
              </span>
            ) : 'Masuk'}
          </button>

          {/* Info */}
          <p className="text-xs text-center text-zinc-600 leading-relaxed">
            Akun dibuat oleh admin. Hubungi admin jika belum punya akun.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
