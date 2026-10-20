'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getNorms, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import { NUTRIENT_META, normBoundsText } from '@/lib/utils/ration';
import { NORM_FIELDS, type NutritionNorm, type RationType } from '@/lib/types/ration/ration';
import NormSidebar from '@/components/ration/NormSidebar';
import { primaryButtonClass, secondaryButtonClass, tdClass, thClass } from '@/components/ui/form';

const ALL_TYPES = Object.keys(RATION_TYPE_LABELS) as RationType[];

export default function NormsPage() {
  const { t } = useTranslation();
  const [norms, setNorms] = useState<NutritionNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebar, setSidebar] = useState<{ norm: NutritionNorm | null; presetType: RationType | null } | null>(null);

  const load = async () => {
    setError('');
    try {
      setNorms(await getNorms());
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить нормы').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const byType = useMemo(() => new Map(norms.map(n => [n.ration_type, n])), [norms]);
  const freeTypes = useMemo(() => ALL_TYPES.filter(k => !byType.has(k)), [byType]);

  return (
    <div className="p-4 md:p-8">
      <Link href="/ration" className="text-sm text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        К списку рационов
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Нормативы питания</h1>
          <p className="text-sm text-neutral-500 mt-1">Рекомендуемые диапазоны на 1 голову в сутки — по ним считаются отклонения рационов</p>
        </div>
        <button
          onClick={() => setSidebar({ norm: null, presetType: null })}
          disabled={loading || freeTypes.length === 0}
          className={primaryButtonClass}
          title={freeTypes.length === 0 ? 'Нормы заданы для всех типов рационов' : undefined}
        >
          Добавить норму
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 p-8"><p className="text-sm text-neutral-500">{t('loading')}</p></div>
      ) : error ? (
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600 whitespace-pre-line mb-4">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Тип рациона</th>
                {NORM_FIELDS.map(k => (
                  <th key={k} className={`${thClass} whitespace-nowrap`}>{NUTRIENT_META[k].label}</th>
                ))}
                <th className={thClass}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {ALL_TYPES.map(type => {
                const norm = byType.get(type);
                return (
                  <tr key={type} className="hover:bg-neutral-50">
                    <td className={`${tdClass} font-medium whitespace-nowrap`}>{RATION_TYPE_LABELS[type]}</td>
                    {norm ? (
                      NORM_FIELDS.map(k => <td key={k} className={`${tdClass} whitespace-nowrap`}>{normBoundsText(norm, k, NUTRIENT_META[k].unit)}</td>)
                    ) : (
                      <td colSpan={NORM_FIELDS.length} className={`${tdClass} text-neutral-400`}>
                        Норма не задана — отклонения для рационов этого типа не проверяются
                      </td>
                    )}
                    <td className={`${tdClass} whitespace-nowrap text-xs`}>
                      {norm ? (
                        <button onClick={() => setSidebar({ norm, presetType: null })} className="text-neutral-600 hover:text-neutral-900">
                          {t('edit')}
                        </button>
                      ) : (
                        <button onClick={() => setSidebar({ norm: null, presetType: type })} className="text-neutral-900 font-medium hover:underline">
                          Задать
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-neutral-400 border-t border-neutral-200">
            Удаление норм API не поддерживает — норму можно только изменить или очистить её границы.
          </p>
        </div>
      )}

      <NormSidebar
        isOpen={sidebar !== null}
        norm={sidebar?.norm ?? null}
        presetType={sidebar?.presetType ?? null}
        freeTypes={freeTypes}
        onClose={() => setSidebar(null)}
        onSaved={() => load()}
      />
    </div>
  );
}
