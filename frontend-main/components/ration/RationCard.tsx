'use client';

import Link from 'next/link';
import { RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { formatMoney, formatPeriod } from '@/lib/utils/ration';
import type { Ration } from '@/lib/types/ration/ration';
import { formatNumber } from '@/components/ui/form';

interface RationCardProps {
  ration: Ration;
  animalLabel: string | null;
  selected: boolean;
  selectDisabled: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border ${active
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
      {active ? 'Активен' : 'Архив'}
    </span>
  );
}

export function rationSubtitle(ration: Ration, animalLabel: string | null): string {
  return `${RATION_TYPE_LABELS[ration.ration_type] ?? ration.ration_type} · ${animalLabel ?? 'без привязки к животному'}`;
}

export default function RationCard({
  ration, animalLabel, selected, selectDisabled, busy,
  onToggleSelect, onEdit, onCopy, onToggleArchive, onDelete,
}: RationCardProps) {
  const n = ration.nutrition;
  const metrics = [
    { label: 'Голов', value: formatNumber(ration.animal_count, 0) },
    { label: 'Период', value: formatPeriod(ration.date_start, ration.date_end) },
    { label: 'СВ', value: `${formatNumber(n.dry_matter)} кг` },
    { label: 'Энергия', value: `${formatNumber(n.energy, 1)} МДж` },
    { label: 'Протеин', value: `${formatNumber(n.protein)} кг` },
    { label: 'Стоимость', value: `${formatMoney(n.cost_per_head)}/гол./сут.` },
  ];

  return (
    <div className={`bg-white border p-4 flex flex-col ${selected ? 'border-neutral-900' : 'border-neutral-200'}`}>
      <div className="flex items-start gap-3 mb-1">
        <input
          type="checkbox"
          checked={selected}
          disabled={selectDisabled && !selected}
          onChange={onToggleSelect}
          className="mt-1"
          aria-label="Выбрать для сравнения"
          title={selectDisabled && !selected ? 'Можно сравнить не больше 4 рационов' : 'Выбрать для сравнения'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/ration/${ration.id}`} className="text-sm font-semibold text-neutral-900 hover:underline break-words">
              {ration.name}
            </Link>
            <ActiveBadge active={ration.is_active} />
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">{rationSubtitle(ration, animalLabel)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
        {metrics.map(m => (
          <div key={m.label}>
            <dt className="text-neutral-500">{m.label}</dt>
            <dd className="text-neutral-900">{m.value}</dd>
          </div>
        ))}
      </dl>

      <p className={`text-xs mt-3 ${ration.deviation_count > 0 ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>
        Отклонений от нормативов: {ration.deviation_count}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-neutral-100 text-xs">
        <Link href={`/ration/${ration.id}`} className="text-neutral-900 font-medium hover:underline">Открыть</Link>
        <button onClick={onEdit} disabled={busy} className="text-neutral-600 hover:text-neutral-900 disabled:text-neutral-300">Редактировать</button>
        <button onClick={onCopy} disabled={busy} className="text-neutral-600 hover:text-neutral-900 disabled:text-neutral-300">Копировать</button>
        <button onClick={onToggleArchive} disabled={busy} className="text-neutral-600 hover:text-neutral-900 disabled:text-neutral-300">
          {ration.is_active ? 'Архивировать' : 'Вернуть из архива'}
        </button>
        <button onClick={onDelete} disabled={busy} className="text-red-600 hover:text-red-700 disabled:text-neutral-300 ml-auto">Удалить</button>
      </div>
    </div>
  );
}
