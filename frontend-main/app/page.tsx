'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

export default function HomePage() {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || !authenticated || redirected.current) return;
    redirected.current = true;
    router.replace('/dashboard');
  }, [authenticated, loading, router]);

  if (loading || authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Agro Platform
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Войдите в систему для доступа к дашборду и модулям.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          Авторизоваться
        </Link>
      </div>
    </main>
  );
}
