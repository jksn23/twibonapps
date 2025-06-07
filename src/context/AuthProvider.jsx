import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek sesi yang sudah ada saat aplikasi pertama kali dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Dengarkan perubahan status auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Berhenti mendengarkan ketika komponen di-unmount
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Buat hook kustom agar mudah digunakan
export function useAuth() {
  return useContext(AuthContext);
}