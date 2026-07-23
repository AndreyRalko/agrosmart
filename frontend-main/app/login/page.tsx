'use client';

import { useState, FormEvent, ChangeEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/lib/api/auth';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { LoginFormData } from '@/lib/types/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const from = searchParams.get('from') || '/dashboard';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.username || !formData.password) {
        setError(t('pleaseEnterCredentials') || 'Пожалуйста, введите логин и пароль');
        setLoading(false);
        return;
      }

      console.log('Submitting login...');
      await login(formData.username, formData.password);
      console.log('Login successful, redirecting...');
      
      window.location.href = from;
    } catch (err) {
      console.error('Login error in component:', err);
      setError(t('invalidCredentials') || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="bg-white border border-neutral-200 p-10">
          <h1 className="text-xl font-semibold mb-8 text-neutral-900 tracking-tight">
            {t('login') || 'Авторизоваться'}
          </h1>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-2">
                {t('username') || 'Логин'}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-50 disabled:text-neutral-500"
                placeholder={t('enterUsername') || 'Введите логин'}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                {t('password') || 'Пароль'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-50 disabled:text-neutral-500"
                placeholder={t('enterPassword') || 'Введите пароль'}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 px-4 text-sm font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (t('loggingIn') || 'Вход...') : (t('login') || 'Авторизоваться')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-full max-w-md">
          <div className="bg-white border border-neutral-200 p-10">
            <div className="text-center text-neutral-500">Загрузка...</div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}