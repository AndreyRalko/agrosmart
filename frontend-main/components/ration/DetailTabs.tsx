'use client';

import Link from 'next/link';
import {
  NORM_STATUS_COLOR, NORM_STATUS_LABEL, NUTRIENT_KEYS, NUTRIENT_META,
  checkNorm, formatDate, formatMoney, formatNormRange, rationLineName, rowNutrition,
} from '@/lib/utils/ration';
import { RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import type { NutritionNorm, Ration, RationNutrition } from '@/lib/types/ration/ration';
import { formatNumber, primaryButtonClass, tdClass, thClass } from '@/components/ui/form';
import { ActiveBadge } from './RationCard';

// ---- Заглушка будущего раздела ----

export function FutureSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white border border-dashed border-neutral-300 p-6">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <span className="px-2 py-0.5 text-xs border border-neutral-200 bg-neutral-50 text-neutral-500">будущий раздел</span>
      </div>
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  );
}

function NoNormNotice({ ration }: { ration: Ration }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-900">
      Норма для типа «{RATION_TYPE_LABELS[ration.ration_type] ?? ration.ration_type}» не задана — сравнивать не с чем.{' '}
      <Link href="/ration/norms" className="underline font-medium">Перейти к справочнику норм</Link>
    </div>
  );
}

// ---- Питательность ----

export function NutritionTab({ ration, nutrition, norm }: { ration: Ration; nutrition: RationNutrition; norm: NutritionNorm | null }) {
  const checks = NUTRIENT_KEYS.map(key => ({ key, meta: NUTRIENT_META[key], actual: nutrition[key], check: checkNorm(nutrition[key], norm, key) }));

  return (
    <div className="space-y-4">
      {!norm && <NoNormNotice ration={ration} />}

      <div>
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Итого на 1 голову / сутки</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {checks.map(({ key, meta, actual, check }) => (
            <div key={key} className="bg-white border border-neutral-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NORM_STATUS_COLOR[check.status] }} title={NORM_STATUS_LABEL[check.status]} />
                <p className="text-xs text-neutral-500 truncate">{meta.label}</p>
              </div>
              <p className="text-lg font-semibold text-neutral-900">{formatNumber(actual, meta.digits)} <span className="text-xs font-normal text-neutral-500">{meta.unit}</span></p>
              <p className="text-xs text-neutral-400 mt-0.5">{formatNormRange(check, meta.unit)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className={thClass}>Показатель</th>
              <th className={thClass}>Фактически</th>
              <th className={thClass}>Рекомендуется</th>
              <th className={thClass}>Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {checks.map(({ key, meta, actual, check }) => (
              <tr key={key} className={check.status === 'bad' ? 'bg-red-50' : check.status === 'warn' ? 'bg-amber-50' : ''}>
                <td className={tdClass}>{meta.label}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{formatNumber(actual, meta.digits)} {meta.unit}</td>
                <td className={`${tdClass} whitespace-nowrap text-neutral-600`}>
                  {check.status === 'none' ? '—' : formatNormRange(check, meta.unit)}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NORM_STATUS_COLOR[check.status] }} />
                    {check.status === 'none' ? 'Норма не задана'
                      : check.status === 'ok' ? 'В норме'
                        : `${(check.deviationPct ?? 0) < 0 ? 'Ниже' : 'Выше'} нормы на ${formatNumber(Math.abs(check.deviationPct ?? 0), 0)} %`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-neutral-400 border-t border-neutral-200">
          Статус считается от ближайшей границы нормы: зелёный — в норме или норма не задана, оранжевый — отклонение до 10 %, красный — больше 10 %.
          Для жира и крахмала нормы в справочнике не предусмотрены.
        </p>
      </div>
    </div>
  );
}

// ---- Стоимость ----

export function CostTab({ ration, nutrition }: { ration: Ration; nutrition: RationNutrition }) {
  const rows = ration.ration_feeds
    .map(rf => ({ name: rationLineName(rf), cost: rowNutrition(rf).cost }))
    .sort((a, b) => b.cost - a.cost);
  const total = nutrition.cost_per_head;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'На 1 голову в сутки', value: formatMoney(nutrition.cost_per_head) },
          { label: `На группу в сутки (${formatNumber(ration.animal_count, 0)} гол.)`, value: formatMoney(nutrition.cost_per_group_day) },
          { label: 'На группу за 30 дней', value: formatMoney(nutrition.cost_per_group_30) },
        ].map(card => (
          <div key={card.label} className="bg-white border border-neutral-200 p-4">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{card.label}</p>
            <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="bg-white border border-neutral-200 p-4">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Вклад кормов в стоимость, на 1 голову</p>
          <ul className="space-y-2">
            {rows.map(r => {
              const pct = total > 0 ? Math.round((r.cost / total) * 100) : 0;
              return (
                <li key={r.name} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-neutral-700">{r.name}</span>
                    <span className="text-neutral-900">{formatMoney(r.cost)} <span className="text-xs text-neutral-400">· {pct}%</span></span>
                  </div>
                  <div className="h-1.5 bg-neutral-100"><div className="h-1.5 bg-neutral-900" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FutureSection
        title="Эффективность рациона"
        text="Стоимость литра молока, привесы и окупаемость рациона появятся, когда API начнёт связывать рационы с продуктивностью животных."
      />
    </div>
  );
}

// ---- Назначения ----

export function AssignmentsTab({ ration, animalLabel, onAssign }: { ration: Ration; animalLabel: string | null; onAssign: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">История назначений появится после доработки API. Сейчас показано текущее назначение из полей рациона.</p>
        <button onClick={onAssign} className={primaryButtonClass}>Назначить рацион</button>
      </div>
      <div className="bg-white border border-neutral-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className={thClass}>Животное</th>
              <th className={thClass}>Голов</th>
              <th className={thClass}>Начало</th>
              <th className={thClass}>Окончание</th>
              <th className={thClass}>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass}>{animalLabel ?? <span className="text-neutral-400">не привязано</span>}</td>
              <td className={tdClass}>{formatNumber(ration.animal_count, 0)}</td>
              <td className={tdClass}>{formatDate(ration.date_start)}</td>
              <td className={tdClass}>{ration.date_end ? formatDate(ration.date_end) : <span className="text-neutral-400">не задано</span>}</td>
              <td className={tdClass}><ActiveBadge active={ration.is_active} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
