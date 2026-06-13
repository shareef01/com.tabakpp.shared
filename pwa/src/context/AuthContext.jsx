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
    // Senior Staff Engineer Note: Explicitly setting local persistence to ensure
    // iPhone Safari sessions survive browser closes and cross-tab navigation.
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.error("Auth persistence failure:", error);
      }

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(u => {
          // Only update state if the user object has actually changed to prevent re-render loops
          if (u?.uid === currentUser?.uid && u?.photoURL === currentUser?.photoURL && u?.displayName === currentUser?.displayName) {
            return u;
          }
          return currentUser;
        });
        setLoading(false);
      }, (error) => {
        console.error("Auth state change failure:", error);
        setLoading(false);
      });

      return unsubscribe;
    };

    const cleanup = initAuth();
    return () => {
      if (typeof cleanup === 'function') cleanup();
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
