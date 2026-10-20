'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getNorms, getRation, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { parseDrfError } from '@/lib/utils/drf-errors';
import {
  NORM_STATUS_COLOR, NUTRIENT_KEYS, NUTRIENT_META, checkNorm, formatMoney, formatNormRange,
} from '@/lib/utils/ration';
import type { NutritionNorm, Ration, RationType } from '@/lib/types/ration/ration';
import { useAnimalLabels } from '@/components/ration/animals';
import { formatNumber, secondaryButtonClass, tdClass, thClass } from '@/components/ui/form';

const MIN_IDS = 2;
const MAX_IDS = 4;

function parseIds(raw: string | null): number[] {
  const ids = (raw ?? '').split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, MAX_IDS);
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = useMemo(() => parseIds(searchParams.get('ids')), [searchParams]);
  const animalLabel = useAnimalLabels();

  const key = ids.join(',');
  const [result, setResult] = useState<{
    key: string;
    rations: Ration[];
    norms: Map<RationType, NutritionNorm>;
    errors: string[];
  } | null>(null);
  const loading = result?.key !== key;
  const rations = result?.rations ?? [];
  const norms = result?.norms ?? new Map<RationType, NutritionNorm>();
  const errors = result?.errors ?? [];

  useEffect(() => {
    if (ids.length < MIN_IDS) return;
    let alive = true;
    (async () => {
      const errs: string[] = [];
      const results = await Promise.allSettled(ids.map(id => getRation(id)));
      const loaded: Ration[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaded.push(r.value);
        else errs.push(`Рацион #${ids[i]}: ${parseDrfError(r.reason, [], 'не удалось загрузить').message}`);
      });
      let normMap = new Map<RationType, NutritionNorm>();
      try {
        normMap = new Map((await getNorms()).map(n => [n.ration_type, n]));
      } catch (err) {
        errs.push(`Нормы: ${parseDrfError(err, [], 'не удалось загрузить').message}`);
      }
      if (alive) setResult({ key: ids.join(','), rations: loaded, norms: normMap, errors: errs });
    })();
    return () => { alive = false; };
  }, [ids]);

  const backLink = (
    <Link href="/ration" className="text-sm text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      К списку рационов
    </Link>
  );

  if (ids.length < MIN_IDS) {
    return (
      <div className="p-4 md:p-8">
        {backLink}
        <div className="bg-white border border-neutral-200 p-8 text-sm text-neutral-600">
          Для сравнения отметьте от {MIN_IDS} до {MAX_IDS} рационов в списке и нажмите «Сравнить».
        </div>
      </div>
    );
  }

  const cell = (ration: Ration, key: typeof NUTRIENT_KEYS[number]) => {
    const meta = NUTRIENT_META[key];
    const actual = ration.nutrition[key];
    const check = checkNorm(actual, norms.get(ration.ration_type) ?? null, key);
    const bg = check.status === 'bad' ? 'bg-red-50' : check.status === 'warn' ? 'bg-amber-50' : '';
    return (
      <td key={ration.id} className={`${tdClass} whitespace-nowrap ${bg}`} title={formatNormRange(check, meta.unit)}>
        <span className="inline-flex items-center gap-2">
          {check.status !== 'none' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NORM_STATUS_COLOR[check.status] }} />}
          {formatNumber(actual, meta.digits)} {meta.unit}
        </span>
      </td>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {backLink}
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Сравнение рационов</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Питательность на 1 голову в сутки. Каждый рацион сравнивается с нормой своего типа; наведите на значение, чтобы увидеть норму.
      </p>

      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm whitespace-pre-line">{errors.join('\n')}</div>
      )}

      {loading ? (
        <div className="bg-white border border-neutral-200 p-8"><p className="text-sm text-neutral-500">Загрузка...</p></div>
      ) : rations.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-sm text-neutral-500">Не удалось загрузить ни одного рациона.</div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Показатель</th>
                {rations.map(r => (
                  <th key={r.id} className={`${thClass} normal-case tracking-normal`}>
                    <Link href={`/ration/${r.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">{r.name}</Link>
                    <div className="text-xs font-normal text-neutral-500 mt-0.5">
                      {RATION_TYPE_LABELS[r.ration_type] ?? r.ration_type} · {animalLabel(r.animal_group) ?? 'без животного'}
                    </div>
                    {!norms.has(r.ration_type) && <div className="text-xs font-normal text-amber-700 mt-0.5">норма не задана</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className={tdClass}>Масса рациона</td>
                {rations.map(r => <td key={r.id} className={tdClass}>{formatNumber(r.nutrition.total_weight, 2)} кг</td>)}
              </tr>
              {NUTRIENT_KEYS.map(key => (
                <tr key={key}>
                  <td className={tdClass}>{NUTRIENT_META[key].label}</td>
                  {rations.map(r => cell(r, key))}
                </tr>
              ))}
              <tr>
                <td className={tdClass}>Стоимость, на 1 голову/сутки</td>
                {rations.map(r => <td key={r.id} className={`${tdClass} font-medium`}>{formatMoney(r.nutrition.cost_per_head)}</td>)}
              </tr>
              <tr>
                <td className={tdClass}>Стоимость, на группу/30 дней</td>
                {rations.map(r => <td key={r.id} className={tdClass}>{formatMoney(r.nutrition.cost_per_group_30)} <span className="text-xs text-neutral-400">({formatNumber(r.animal_count, 0)} гол.)</span></td>)}
              </tr>
              <tr>
                <td className={tdClass}>Отклонений (по данным сервера)</td>
                {rations.map(r => (
                  <td key={r.id} className={`${tdClass} ${r.deviation_count > 0 ? 'text-red-600 font-medium' : ''}`}>{r.deviation_count}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link href="/ration" className={`${secondaryButtonClass} inline-block`}>Выбрать другие рационы</Link>
      </div>
    </div>
  );
}

export default function RationComparePage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-8 text-sm text-neutral-500">Загрузка...</div>}>
      <CompareContent />
    </Suspense>
  );
}
