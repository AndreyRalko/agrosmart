import { useState, useEffect } from 'react';
import { getLanguage } from '@/lib/api/client';
import { translations, type TranslationKey } from '@/lib/i18n/translations';

export function useTranslation() {
  const [language, setLanguage] = useState<'ru' | 'kk'>('ru');

  useEffect(() => {
    const lang = getLanguage() as 'ru' | 'kk';
    setLanguage(lang);
  }, []);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return { t, language };
}