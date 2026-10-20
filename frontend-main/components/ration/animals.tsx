'use client';

import { useEffect, useRef, useState } from 'react';
import { getAnimals } from '@/lib/api/animal/animal';
import type { Animal } from '@/lib/types/animal/animal';
import { inputClass } from '@/components/ui/form';

/**
 * Подписи животных по id. Рацион хранит animal_group как id одного животного,
 * бирку приходится брать из /animal/. Если животного нет в первых 100 — «Животное #id».
 */
export function useAnimalLabels() {
  const [tags, setTags] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    getAnimals()
      .then(data => setTags(new Map((data.results || []).map(a => [a.id, a.tag]))))
      .catch(() => setTags(new Map()));
  }, []);

  return (id: number | null): string | null => {
    if (id === null) return null;
    const tag = tags.get(id);
    return tag ? `#${tag}` : `Животное #${id}`;
  };
}

interface AnimalSelectProps {
  value: number | null;
  /** Подпись выбранного животного, если оно уже задано. */
  valueLabel: string | null;
  onChange: (id: number | null, label: string | null) => void;
  error?: boolean;
}

/** Выбор одного животного с серверным поиском по бирке (`/animal/?tag=`, istartswith). */
export function AnimalSelect({ value, valueLabel, onChange, error }: AnimalSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setLoading(true);
      setSearchError('');
      getAnimals(query.trim() || undefined)
        .then(data => setResults(data.results || []))
        .catch(() => { setResults([]); setSearchError('Не удалось загрузить животных'); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      {value !== null && !open ? (
        <div className={`${error ? 'border-red-500' : 'border-neutral-300'} flex items-center justify-between px-3 py-2 border bg-white text-sm`}>
          <span className="text-neutral-900">{valueLabel ?? `Животное #${value}`}</span>
          <div className="flex gap-3 text-xs">
            <button type="button" onClick={() => setOpen(true)} className="text-neutral-600 hover:text-neutral-900">Изменить</button>
            <button type="button" onClick={() => onChange(null, null)} className="text-neutral-600 hover:text-red-600">Убрать</button>
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Поиск по бирке…"
          className={error ? inputClass.replace('border-neutral-300', 'border-red-500') : inputClass}
        />
      )}

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 shadow-sm max-h-56 overflow-y-auto">
          {loading && <p className="px-3 py-2 text-xs text-neutral-500">Загрузка…</p>}
          {!loading && searchError && <p className="px-3 py-2 text-xs text-red-600">{searchError}</p>}
          {!loading && !searchError && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-500">Ничего не найдено</p>
          )}
          {!loading && results.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id, `#${a.tag}`); setOpen(false); setQuery(''); }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${a.id === value ? 'bg-neutral-100' : ''}`}
            >
              #{a.tag} <span className="text-xs text-neutral-500">· {a.breed?.name}</span>
            </button>
          ))}
          {value !== null && (
            <button type="button" onClick={() => setOpen(false)} className="block w-full text-left px-3 py-2 text-xs text-neutral-500 border-t border-neutral-100 hover:bg-neutral-50">
              Отмена
            </button>
          )}
        </div>
      )}
    </div>
  );
}
