import React, { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { Button } from '@/components/ui/button'; // Impor Button
import { Input } from '@/components/ui/input';   // Impor Input


export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      alert('Login berhasil! Anda akan diarahkan ke Dashboard.');
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 border rounded-lg shadow-lg bg-card text-card-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Selamat Datang</h1>
          <p className="text-muted-foreground">Silakan masuk atau daftar untuk melanjutkan</p>
        </div>
        <form className="space-y-6">
          <Input
            type="email"
            placeholder="Email Anda"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password Anda"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex flex-col space-y-2">
            <Button onClick={handleLogin} disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
            <Button variant="secondary" onClick={handleSignUp} disabled={loading}>
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}