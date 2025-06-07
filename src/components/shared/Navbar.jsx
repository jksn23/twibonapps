import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/supabaseClient.js';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-foreground">
              Twibbon<span className="text-primary">Creator</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button asChild variant="ghost">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button onClick={handleLogout} variant="outline">
                  Keluar
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button asChild>
                  <Link to="/login">Daftar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}