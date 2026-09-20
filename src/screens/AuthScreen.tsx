import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      setSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    const result =
      mode === 'signup'
        ? await signUp(name.trim(), email.trim(), password)
        : await signIn(email.trim(), password);

    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-lime-500 flex items-center justify-center mb-4 shadow-lg shadow-lime-500/20">
            <Sparkles className="w-8 h-8 text-ink-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Web3 Sabi</h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            Learn Web3, one concept at a time.
          </p>
        </div>

        {/* Card */}
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-6 animate-slide-up">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-lime-500 text-ink-950'
                  : 'bg-ink-800 text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-lime-500 text-ink-950'
                  : 'bg-ink-800 text-gray-400 hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Okoro"
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-lime-500 text-ink-950 font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-lime-400 hover:shadow-lg hover:shadow-lime-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signup' ? 'Start Learning' : 'Log In'}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-5">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }}
              className="text-lime-500 font-medium hover:text-lime-400 transition-colors"
            >
              {mode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
