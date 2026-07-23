'use client';

import { useState, useEffect } from 'react';
import { setLanguage as setApiLanguage, getLanguage } from '@/lib/api/client';

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState('ru');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLanguage(getLanguage());
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setApiLanguage(lang);
    window.location.reload(); // Перезагрузка для применения языка
  };

  if (!mounted) return null;

  return (
    <div className="flex gap-1 bg-neutral-100 p-1 rounded">
      <button
        onClick={() => handleLanguageChange('ru')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          language === 'ru'
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => handleLanguageChange('kk')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          language === 'kk'
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        }`}
      >
        KK
      </button>
    </div>
  );
}