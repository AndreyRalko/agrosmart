'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { ModuleKey } from '@/lib/constants/modules';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { canAccessModule, loading: permissionsLoading } = usePermissions();
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMachineryOpen, setIsMachineryOpen] = useState(false);
  const [isAnimalOpen, setIsAnimalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isRationOpen, setIsRationOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/machinery')) setIsMachineryOpen(true);
    if (pathname.startsWith('/animal')) setIsAnimalOpen(true);
    if (pathname.startsWith('/notification')) setIsNotificationOpen(true);
    if (pathname.startsWith('/ration')) setIsRationOpen(true);
  }, [pathname]);

  const menuItems: Array<{ name: string; href: string; module: ModuleKey; icon: React.ReactNode }> = [
    { 
      name: 'Дашборд',
      href: '/dashboard',
      module: 'dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      )
    },
    { 
      name: 'Персоны', 
      href: '/persons',
      module: 'persons',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    },
    { 
      name: 'Департаменты', 
      href: '/departments',
      module: 'departments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      )
    },
    { 
      name: 'Позиции', 
      href: '/positions',
      module: 'positions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      )
    },
    { 
      name: 'Карта',
      href: '/fields',
      module: 'fields',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      )
    },
    { 
      name: 'Интеграции',
      href: '/integration',
      module: 'integration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )
    },
    { 
      name: 'Культуры и сорта',
      href: '/culture',
      module: 'culture',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )
    },
    { 
      name: 'Удобрения',
      href: '/fertilizer',
      module: 'fertilizer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      )
    },
    { 
      name: 'Задания',
      href: '/tasks',
      module: 'tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      )
    },
    { 
  name: 'NDVI-мониторинг',
  href: '/ndvi',
  module: 'ndvi',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  )
    },
  ];

  const machinerySubItems = [
    { name: 'Бренды', href: '/machinery/brands' },
    { name: 'Типы', href: '/machinery/types' },
    { name: 'Техника', href: '/machinery' },
  ];

  const animalSubItems = [
    { name: 'Породы', href: '/animal/breeds' },
    { name: 'Животные', href: '/animal' },
    { name: 'Качество молока', href: '/animal/milk-quality' },
  ];

  const rationSubItems = [
    { name: 'Рационы', href: '/ration', isActive: (p: string) => p === '/ration' || (p.startsWith('/ration/') && !p.startsWith('/ration/feeds') && !p.startsWith('/ration/norms')) },
    { name: 'Корма', href: '/ration/feeds', isActive: (p: string) => p.startsWith('/ration/feeds') },
    { name: 'Нормы', href: '/ration/norms', isActive: (p: string) => p.startsWith('/ration/norms') },
  ];

  const notificationSubItems = [
    { name: 'Уведомления', href: '/notification' },
    { name: 'Настройки', href: '/notification/settings' },
  ];

  const visibleMenuItems = menuItems.filter(
    item => permissionsLoading || canAccessModule(item.module, 'view'),
  );

  const showAgroOperations = permissionsLoading || canAccessModule('agro_operations', 'view');
  const showNotifications = permissionsLoading || canAccessModule('notification', 'view');
  const showMachinery = permissionsLoading || canAccessModule('machinery', 'view');
  const showAnimal = permissionsLoading || canAccessModule('animal', 'view');
  const showStorage = permissionsLoading || canAccessModule('storage', 'view');
  const showRation = permissionsLoading || canAccessModule('ration', 'view');

  if (!mounted) return null;

  const expandedClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 transition-colors w-full ${
      active ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
    } ${!isHovered && !isOpen ? 'lg:justify-center' : ''}`;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-neutral-200 z-50 transform transition-all duration-200 ease-in-out
          ${isOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60'}
          lg:translate-x-0 lg:static lg:h-screen
          ${isHovered ? 'lg:w-60' : 'lg:w-16'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-200">
            <h2 className={`text-base font-semibold text-neutral-900 transition-opacity duration-200 ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0'}`} />
            <button
              onClick={onClose}
              className="lg:hidden text-neutral-500 hover:text-neutral-900 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-2">
            <ul className="space-y-1">
              {/* Обычные пункты */}
              {visibleMenuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={expandedClass(pathname === item.href)}
                    title={!isHovered && !isOpen ? item.name : ''}
                  >
                    {item.icon}
                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}

              {/* Агро-операции */}
              {showAgroOperations && (
              <li>
                <Link
                  href="/agro-operations"
                  onClick={onClose}
                  className={expandedClass(pathname === '/agro-operations')}
                  title={!isHovered && !isOpen ? 'Агро-операции' : ''}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                    Агро-операции
                  </span>
                </Link>
              </li>
              )}

              {/* Уведомления (с подменю) */}
              {showNotifications && (
              <li>
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={expandedClass(pathname.startsWith('/notification'))}
                  title={!isHovered && !isOpen ? 'Уведомления' : ''}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                      Уведомления
                    </span>
                  </div>
                  {(isHovered || isOpen) && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isNotificationOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {isNotificationOpen && (isHovered || isOpen) && (
                  <ul className="mt-1 ml-11 space-y-1">
                    {notificationSubItems.map((subItem) => (
                      <li key={subItem.href}>
                        <Link
                          href={subItem.href}
                          onClick={onClose}
                          className={`block px-3 py-2 text-sm transition-colors rounded ${
                            pathname === subItem.href
                              ? 'bg-neutral-100 text-neutral-900 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              )}

              {showStorage && (
              <li>
                <Link
                  href="/storage"
                  onClick={onClose}
                  className={expandedClass(pathname === '/storage' || pathname.startsWith('/storage/'))}
                  title={!isHovered && !isOpen ? 'Хранение кормов' : ''}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                    Хранение кормов
                  </span>
                </Link>
              </li>
              )}

              {showRation && (
              <li>
                <button
                  onClick={() => setIsRationOpen(!isRationOpen)}
                  className={expandedClass(pathname === '/ration' || pathname.startsWith('/ration/'))}
                  title={!isHovered && !isOpen ? 'Кормление' : ''}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v8.142c0 1.135.845 2.098 1.976 2.192.917.076 1.85.122 2.774.138M12 8.25c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v8.142c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-2.774.138M12 8.25V6.375m0 14.705v.128c0 .414-.336.75-.75.75h-1.5a.75.75 0 01-.75-.75v-.128M12 21.208V6.375m0 0A2.25 2.25 0 009.75 4.125h4.5A2.25 2.25 0 0012 6.375" />
                    </svg>
                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                      Кормление
                    </span>
                  </div>
                  {(isHovered || isOpen) && (
                    <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isRationOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                {isRationOpen && (isHovered || isOpen) && (
                  <ul className="mt-1 ml-11 space-y-1">
                    {rationSubItems.map((subItem) => (
                      <li key={subItem.href}>
                        <Link
                          href={subItem.href}
                          onClick={onClose}
                          className={`block px-3 py-2 text-sm transition-colors rounded ${
                            subItem.isActive(pathname)
                              ? 'bg-neutral-100 text-neutral-900 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              )}

              {/* Мех. оборудование */}
              {showMachinery && (
              <li>
                <button
                  onClick={() => setIsMachineryOpen(!isMachineryOpen)}
                  className={expandedClass(pathname.startsWith('/machinery'))}
                  title={!isHovered && !isOpen ? 'Механическое оборудование' : ''}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                      Мех. оборудование
                    </span>
                  </div>
                  {(isHovered || isOpen) && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isMachineryOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {isMachineryOpen && (isHovered || isOpen) && (
                  <ul className="mt-1 ml-11 space-y-1">
                    {machinerySubItems.map((subItem) => (
                      <li key={subItem.href}>
                        <Link
                          href={subItem.href}
                          onClick={onClose}
                          className={`block px-3 py-2 text-sm transition-colors rounded ${
                            pathname === subItem.href
                              ? 'bg-neutral-100 text-neutral-900 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              )}

              {/* Животные */}
              {showAnimal && (
              <li>
                <button
                  onClick={() => setIsAnimalOpen(!isAnimalOpen)}
                  className={expandedClass(pathname.startsWith('/animal'))}
                  title={!isHovered && !isOpen ? 'Животные' : ''}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                      Животные
                    </span>
                  </div>
                  {(isHovered || isOpen) && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isAnimalOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {isAnimalOpen && (isHovered || isOpen) && (
                  <ul className="mt-1 ml-11 space-y-1">
                    {animalSubItems.map((subItem) => (
                      <li key={subItem.href}>
                        <Link
                          href={subItem.href}
                          onClick={onClose}
                          className={`block px-3 py-2 text-sm transition-colors rounded ${
                            pathname === subItem.href
                              ? 'bg-neutral-100 text-neutral-900 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              )}
            </ul>
          </nav>

          <div className="p-4 border-t border-neutral-200">
            <div className={`${isHovered || isOpen ? 'opacity-100' : 'lg:opacity-0 lg:hidden'}`}>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}