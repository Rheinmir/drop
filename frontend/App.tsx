import React, { useState, useEffect } from 'react';
import { BubbleBackground } from './components/BubbleBackground';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { login } from './services/api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check session storage on mount
    const savedToken = sessionStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleLogin = async (password: string): Promise<boolean> => {
    const success = await login(password);
    if (success) {
      sessionStorage.setItem('auth_token', password);
      setToken(password);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth_token');
    setToken(null);
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-100 selection:bg-ocean-500/30">
      <BubbleBackground />
      
      {token ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
