'use client';

import { useEffect, useState } from 'react';
import { getDashboard } from '@/lib/api/dashboard';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { DashboardData } from '@/lib/types/dashboard';
import FieldsMapWidget from '@/components/dashboard/FieldsMapWidget';
import IntegrationStatsWidget from '@/components/dashboard/IntegrationStatsWidget';
import TemperatureWidget from '@/components/dashboard/TemperatureWidget';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await getDashboard();
      setData(dashboardData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('dashboard')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('dashboard')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number | null) => {
    return num !== null ? num.toFixed(1) : '-';
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <IntegrationStatsWidget />
        <TemperatureWidget />
      </div>

      <FieldsMapWidget />

      {/* Animals Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('animals')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Total Animals */}
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-sm text-neutral-600 mb-1">{t('total')}</div>
            <div className="text-2xl font-semibold text-neutral-900">{data.animal.total}</div>
          </div>
        </div>

        {/* Milk Quality */}
        <div className="bg-white border border-neutral-200 p-4 mb-4">
          <h3 className="text-md font-semibold text-neutral-900 mb-4">{t('milkQuality')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today */}
            <div>
              <div className="text-sm font-medium text-neutral-700 mb-3">{t('today')}</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t('collected')}:</span>
                  <span className="font-medium text-neutral-900">{data.animal.milk_quality.today.collected}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t('leftToCollect')}:</span>
                  <span className="font-medium text-neutral-900">{data.animal.milk_quality.today.left_to_collect}</span>
                </div>
                
                <div className="pt-2 border-t border-neutral-200">
                  <div className="text-xs font-medium text-neutral-700 mb-2">{t('fat')} (%)</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-neutral-500">{t('min')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.fat.min)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('max')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.fat.max)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('avg')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.fat.avg)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200">
                  <div className="text-xs font-medium text-neutral-700 mb-2">{t('protein')} (%)</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-neutral-500">{t('min')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.protein.min)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('max')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.protein.max)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('avg')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.today.protein.avg)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Yesterday */}
            <div>
              <div className="text-sm font-medium text-neutral-700 mb-3">{t('yesterday')}</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t('collected')}:</span>
                  <span className="font-medium text-neutral-900">{data.animal.milk_quality.yesterday.collected}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t('leftToCollect')}:</span>
                  <span className="font-medium text-neutral-900">{data.animal.milk_quality.yesterday.left_to_collect}</span>
                </div>
                
                <div className="pt-2 border-t border-neutral-200">
                  <div className="text-xs font-medium text-neutral-700 mb-2">{t('fat')} (%)</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-neutral-500">{t('min')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.fat.min)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('max')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.fat.max)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('avg')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.fat.avg)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200">
                  <div className="text-xs font-medium text-neutral-700 mb-2">{t('protein')} (%)</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-neutral-500">{t('min')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.protein.min)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('max')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.protein.max)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">{t('avg')}</div>
                      <div className="font-medium text-neutral-900">{formatNumber(data.animal.milk_quality.yesterday.protein.avg)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('personnel')}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('working')}</div>
            <div className="text-xl font-semibold text-green-600">{data.person.total_working}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('vacation')}</div>
            <div className="text-xl font-semibold text-yellow-600">{data.person.total_vacation}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('todayBirthday')}</div>
            <div className="text-xl font-semibold text-blue-600">{data.person.today_birthday}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('hiredLast7d')}</div>
            <div className="text-xl font-semibold text-neutral-900">{data.person.hired_last_7d}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('hiredLast30d')}</div>
            <div className="text-xl font-semibold text-neutral-900">{data.person.hired_last_30d}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('firedLast7d')}</div>
            <div className="text-xl font-semibold text-red-600">{data.person.fired_last_7d}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">{t('firedLast30d')}</div>
            <div className="text-xl font-semibold text-red-600">{data.person.fired_last_30d}</div>
          </div>
        </div>
      </div>

      {/* Machinery Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('machinery')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-sm text-neutral-600 mb-1">{t('total')}</div>
            <div className="text-2xl font-semibold text-neutral-900">{data.machinery.total}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-sm text-neutral-600 mb-1">{t('yearProduction')} ({t('min')})</div>
            <div className="text-2xl font-semibold text-neutral-900">{formatNumber(data.machinery.year_production.min)}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-sm text-neutral-600 mb-1">{t('yearProduction')} ({t('max')})</div>
            <div className="text-2xl font-semibold text-neutral-900">{formatNumber(data.machinery.year_production.max)}</div>
          </div>
          
          <div className="bg-white border border-neutral-200 p-4">
            <div className="text-sm text-neutral-600 mb-1">{t('yearProduction')} ({t('avg')})</div>
            <div className="text-2xl font-semibold text-neutral-900">{formatNumber(data.machinery.year_production.avg)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}