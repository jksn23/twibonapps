import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold text-foreground">
        Buat Kampanye Twibbon Anda Sendiri
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Unggah bingkai, bagikan link unik, dan biarkan dunia meramaikan acaramu. Cepat, mudah, dan modern.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link to={user ? "/dashboard" : "/login"}>
            Mulai Sekarang
          </Link>
        </Button>
      </div>
    </div>
  );
}