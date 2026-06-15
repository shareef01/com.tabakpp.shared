import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';

const AuthContext = createContext({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.error("Auth persistence failure:", error);
      }

      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!currentUser) {
          // SECURE LOGOUT: Clear session-specific local storage
          localStorage.removeItem('tabak_accent');
        }
        setUser(currentUser);
        setLoading(false);
      }, (error) => {
        console.error("Auth error:", error);
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
