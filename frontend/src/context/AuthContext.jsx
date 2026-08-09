import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

/**
 * Descodifica o payload do JWT para verificar a expiração do token.
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Margem de tolerância de 10 segundos
    return payload.exp * 1000 < (Date.now() + 10000);
  } catch {
    return true; // Se não for possível descodificar, trata como expirado por segurança
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken && isTokenExpired(storedToken)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
      return storedToken || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken && isTokenExpired(storedToken)) {
        return null;
      }
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (loginData) => {
    const newToken = loginData.token;
    const newUser = loginData.user || {
      id: loginData.user_id || loginData.id,
      email: loginData.email,
      role: loginData.role,
      name: loginData.name,
      tipo: loginData.tipo,
      area_clinica_id: loginData.area_clinica_id,
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  // Auto-logout por inatividade (15 minutos sem interações do utilizador)
  useEffect(() => {
    if (!token || !user) return;

    const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
    let idleTimer = null;

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        logout();
        toast.error('Sessão encerrada por inatividade de 15 minutos.');
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [token, user]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user && !isTokenExpired(token)),
      login,
      logout,
      updateUser,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
