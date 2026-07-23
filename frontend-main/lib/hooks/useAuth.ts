import { useState, useEffect } from 'react';
import { isAuthenticated, logout as logoutApi } from '@/lib/api/auth';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkAuth = () => {
      const auth = isAuthenticated();
      setAuthenticated(auth);
      setLoading(false);
    };
    
    checkAuth();
    
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const logout = () => {
    setAuthenticated(false);
    logoutApi();
  };

  if (!mounted) {
    return { authenticated: false, loading: true, logout };
  }

  return { authenticated, loading, logout };
}