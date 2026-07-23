'use client';

import { useState, useEffect } from 'react';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { getVarietiesByCulture } from '@/lib/api/culture-operations/custom-variety';
import { calculateFertilizerDose } from '@/lib/api/fertilizer/fertilizer';
import type { NutrientKey, NutrientInput, FertilizerDoseResponse } from '@/lib/types/fertilizer/fertilizer';

// ---- Constants ----

const NUTRIENT_META: Record<NutrientKey, { title: string; color: string; bg: string; border: string }> = {
  N:    { title: 'Азот (N)',       color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  P2O5: { title: 'Фосфор (P₂O₅)', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  K2O:  { title: 'Калий (K₂O)',   color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
};

const NUTRIENT_FIELDS: { key: keyof NutrientInput; label: string; unit: string }[] = [
  { key: 'available_soil_content',                     label: 'Доступный элемент в почве',             unit: 'кг/га' },
  { key: 'soil_utilization_coefficient',               label: 'Коэф. использования из почвы',          unit: 'доля (0–1)' },
  { key: 'mineral_fertilizer_utilization_coefficient', label: 'Коэф. использования из мин. удобрений', unit: 'доля (0–1)' },
  { key: 'organic_supply',                             label: 'Поступление с органикой',               unit: 'кг/га' },
];

const RESULT_ROWS: { key: keyof import('@/lib/types/fertilizer/fertilizer').NutrientResult; label: string; bold?: boolean }[] = [
  { key: 'nutrient_removal',      label: 'Вынос питательного вещества' },
  { key: 'total_requirement',     label: 'Общая потребность' },
  { key: 'from_soil',             label: 'Поступление из почвы' },
  { key: 'deficit',               label: 'Дефицит' },
  { key: 'active_substance_dose', label: 'Доза д.в. (кг д.в./га)', bold: true },
];

type RawNutrient = Record<keyof NutrientInput, string>;
type RawValues = Record<NutrientKey, RawNutrient>;

const EMPTY_RAW: RawNutrient = {
  available_soil_content: '',
  soil_utilization_coefficient: '',
  mineral_fertilizer_utilization_coefficient: '',
  organic_supply: '',
};

function parseNutrient(raw: RawNutrient): NutrientInput {
  const result: NutrientInput = {
    available_soil_content: parseFloat(raw.available_soil_content) || 0,
    soil_utilization_coefficient: parseFloat(raw.soil_utilization_coefficient) || 0,
    mineral_fertilizer_utilization_coefficient: parseFloat(raw.mineral_fertilizer_utilization_coefficient) || 0,
  };
  if (raw.organic_supply) result.organic_supply = parseFloat(raw.organic_supply) || 0;
  return result;
}

interface SelectOption { id: number; label: string; }

// ---- Page ----

export default function FertilizerPage() {
  const [cultures, setCultures] = useState<SelectOption[]>([]);
  const [varieties, setVarieties] = useState<SelectOption[]>([]);
  const [selectedCulture, setSelectedCulture] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [loadingVarieties, setLoadingVarieties] = useState(false);

  const [plannedYield, setPlannedYield] = useState('');
  const [collapsed, setCollapsed] = useState<Record<NutrientKey, boolean>>({ N: false, P2O5: false, K2O: false });

  const [rawValues, setRawValues] = useState<RawValues>({
    N:    { ...EMPTY_RAW },
    P2O5: { ...EMPTY_RAW },
    K2O:  { ...EMPTY_RAW },
  });

  const [result, setResult] = useState<FertilizerDoseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCultures()
      .then(res => setCultures((res.results || []).map(c => ({ id: c.id, label: c.name_ru || c.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCulture) { setVarieties([]); setSelectedVariety(''); return; }
    setLoadingVarieties(true);
    getVarietiesByCulture(Number(selectedCulture))
      .then(res => setVarieties((res.results || []).map(v => ({ id: v.id, label: v.name_ru || v.name }))))
      .catch(() => setVarieties([]))
      .finally(() => setLoadingVarieties(false));
  }, [selectedCulture]);

  const handleInput = (nutrient: NutrientKey, field: keyof NutrientInput, value: string) => {
    setRawValues(prev => ({
      ...prev,
      [nutrient]: { ...prev[nutrient], [field]: value },
    }));
    setResult(null);
  };

  const handleCalculate = async () => {
    if (!selectedVariety) { setError('Выберите сорт'); return; }
    if (!plannedYield || parseFloat(plannedYield) <= 0) { setError('Введите планируемую урожайность'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await calculateFertilizerDose({
        culture_variety: Number(selectedVariety),
        planned_yield: parseFloat(plannedYield),
        nutrients: {
          N:    parseNutrient(rawValues.N),
          P2O5: parseNutrient(rawValues.P2O5),
          K2O:  parseNutrient(rawValues.K2O),
        },
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedCulture('');
    setSelectedVariety('');
    setPlannedYield('');
    setRawValues({ N: { ...EMPTY_RAW }, P2O5: { ...EMPTY_RAW }, K2O: { ...EMPTY_RAW } });
    setResult(null);
    setError('');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-1">Расчёт удобрений</h1>
        <p className="text-sm text-neutral-500">Балансовый метод расчёта потребности в минеральных удобрениях (кг д.в./га)</p>
      </div>

      {/* Культура + сорт + урожайность */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Культура <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCulture}
              onChange={e => { setSelectedCulture(e.target.value); setSelectedVariety(''); }}
              className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 rounded"
            >
              <option value="">Выберите культуру</option>
              {cultures.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Сорт <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVariety}
              onChange={e => setSelectedVariety(e.target.value)}
              disabled={!selectedCulture || loadingVarieties}
              className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 rounded disabled:bg-neutral-50 disabled:text-neutral-400"
            >
              <option value="">
                {loadingVarieties ? 'Загрузка...' : !selectedCulture ? 'Сначала выберите культуру' : 'Выберите сорт'}
              </option>
              {varieties.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Планируемая урожайность <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-neutral-300 rounded overflow-hidden">
              <input
                type="number"
                step="any"
                value={plannedYield}
                onChange={e => { setPlannedYield(e.target.value); setResult(null); }}
                placeholder="0"
                className="flex-1 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none"
              />
              <span className="px-3 py-2 text-xs text-neutral-400 bg-neutral-50 border-l border-neutral-300">т/га</span>
            </div>
          </div>
        </div>
      </div>

      {/* Блоки N, P2O5, K2O */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {(['N', 'P2O5', 'K2O'] as NutrientKey[]).map(key => {
          const meta = NUTRIENT_META[key];
          return (
            <div key={key} className="bg-white border rounded-lg overflow-hidden" style={{ borderColor: meta.border }}>
              <button
                type="button"
                onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
                className="w-full flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: meta.border, backgroundColor: meta.bg }}
              >
                <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.title}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${collapsed[key] ? '' : 'rotate-180'}`}
                  style={{ color: meta.color }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>

              {!collapsed[key] && (
                <div className="p-4 space-y-3">
                  {NUTRIENT_FIELDS.map(({ key: fieldKey, label, unit }) => (
                    <div key={fieldKey}>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
                      <div className="flex items-center border border-neutral-200 rounded overflow-hidden">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rawValues[key][fieldKey]}
                          onChange={e => handleInput(key, fieldKey, e.target.value)}
                          placeholder="0"
                          className="flex-1 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none"
                        />
                        <span className="px-2 py-2 text-xs text-neutral-400 bg-neutral-50 border-l border-neutral-200 whitespace-nowrap">
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
      )}

      {/* Кнопки */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="px-6 py-2.5 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#16a34a' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
        >
          {loading ? 'Считаем...' : 'Рассчитать'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 text-sm font-medium rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Сбросить
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4">
            Результат — потребность в минеральных удобрениях
          </h2>

          {/* Итоговые дозы */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(['N', 'P2O5', 'K2O'] as NutrientKey[]).map(key => {
              const meta = NUTRIENT_META[key];
              const dose = result.nutrients[key]?.active_substance_dose ?? 0;
              return (
                <div key={key} className="rounded-lg p-4 text-center" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
                  <p className="text-xs font-medium mb-2" style={{ color: meta.color }}>{meta.title}</p>
                  <p className="text-3xl font-bold mb-1" style={{ color: meta.color }}>{dose.toFixed(1)}</p>
                  <p className="text-xs font-medium" style={{ color: meta.color }}>кг д.в./га</p>
                </div>
              );
            })}
          </div>

          {/* Таблица детализации */}
          <div className="border border-neutral-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-600 uppercase tracking-wide">Показатель</th>
                  {(['N', 'P2O5', 'K2O'] as NutrientKey[]).map(key => (
                    <th key={key} className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: NUTRIENT_META[key].color }}>
                      {NUTRIENT_META[key].title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESULT_ROWS.map((row, i) => (
                  <tr key={row.key} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td className={`px-4 py-2.5 text-neutral-700 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                    {(['N', 'P2O5', 'K2O'] as NutrientKey[]).map(key => {
                      const val = result.nutrients[key]?.[row.key] ?? 0;
                      return (
                        <td
                          key={key}
                          className={`px-4 py-2.5 text-right tabular-nums ${row.bold ? 'font-bold' : 'text-neutral-800'}`}
                          style={row.bold ? { color: NUTRIENT_META[key].color } : {}}
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}