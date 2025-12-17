import React, { useState } from 'react';
import { Lock, Droplets } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await onLogin(password);
    if (!success) {
      setError('Incorrect password. Access denied.');
      setLoading(false);
    }
    // If success, parent component handles state transition, so we don't need to setLoading(false)
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl animate-float">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-ocean-500/20 text-ocean-300 ring-1 ring-ocean-400/30 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
            <Droplets size={48} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2 tracking-wide">Drop</h1>
        <p className="text-center text-slate-400 mb-8">Secure Ocean Storage</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500/50 transition-all duration-300"
                placeholder="Enter access code..."
                autoFocus
              />
              <div className="absolute right-4 top-3.5 text-slate-500">
                <Lock size={18} />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-ocean-900/50 transition-all duration-300 ${
              loading
                ? 'bg-slate-700 cursor-wait'
                : 'bg-gradient-to-r from-ocean-600 to-teal-500 hover:from-ocean-500 hover:to-teal-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? 'Authenticating...' : 'Dive In'}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-slate-500 text-xs tracking-widest uppercase opacity-60">
        Internal Network Only
      </div>
    </div>
  );
};
