'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getNotifications, markNotificationRead } from '@/lib/api/notification/notification';
import type { Notification } from '@/lib/types/notification/notification';

interface NavbarProps {
  onMenuClick: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { authenticated, loading, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.status === 'sent').length;

  useEffect(() => {
    if (authenticated) {
      fetchNotifications();
    }
  }, [authenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.results || []);
    } catch {
      // тихо
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' } : n)
      );
    } catch {
      // тихо
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => n.status === 'sent');
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
  };

  return (
    <nav className="bg-white h-14 border-b border-neutral-200">
      <div className="max-w-full mx-auto px-6">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden text-neutral-700 hover:text-neutral-900 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Колокольчик */}
            {authenticated && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(prev => !prev)}
                  className="relative p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                  aria-label="Уведомления"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-medium"
                      style={{ backgroundColor: '#ef4444', fontSize: '10px' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {isOpen && (
                  <div
                    className="absolute right-0 mt-1 w-80 bg-white border border-neutral-200 shadow-lg z-50"
                    style={{ top: '100%' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                      <span className="text-sm font-semibold text-neutral-900">
                        Уведомления
                        {unreadCount > 0 && (
                          <span
                            className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            {unreadCount}
                          </span>
                        )}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          Прочитать все
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-neutral-400">
                          Нет уведомлений
                        </div>
                      ) : (
                        notifications.map(n => {
                          const isUnread = n.status === 'sent';
                          const ctx = n.context_data;
                          if (!ctx) return null;
                          return (
                            <div
                              key={n.id}
                              className="px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
                              style={isUnread ? { backgroundColor: '#fafef5' } : {}}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Операция + сорт */}
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {ctx.operation_name_ru}
                                  </p>
                                  <p className="text-xs text-neutral-500 mt-0.5">
                                    Поле №{ctx.field_no} · {ctx.culture_variety_name_ru}
                                  </p>
                                  {/* Условия */}
                                  {ctx.checked_conditions?.length > 0 && (
                                    <div className="mt-1.5 space-y-0.5">
                                      {ctx.checked_conditions.map((cc, i) => {
                                        const condStr = Object.entries(cc.condition || {})
                                          .map(([op, val]) => {
                                            const labels: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=' };
                                            return `${labels[op] ?? op} ${val}`;
                                          }).join(', ');
                                        return (
                                          <p key={i} className="text-xs" style={{ color: '#16a34a' }}>
                                            {cc.field_name}: {cc.value_numeric} ({condStr}) ✓
                                          </p>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <p className="text-xs text-neutral-400 mt-1">{formatTime(n.created_at)}</p>
                                </div>
                                {isUnread && (
                                  <button
                                    onClick={() => handleMarkRead(n.id)}
                                    className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                                    style={{ backgroundColor: '#3b82f6' }}
                                    title="Отметить прочитанным"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Выход / Авторизация */}
            {loading ? (
              <span className="text-sm text-neutral-500">Loading...</span>
            ) : authenticated ? (
              <button
                onClick={logout}
                className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-4 py-1.5 transition-colors"
              >
                Выход
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium bg-neutral-900 text-white px-4 py-1.5 hover:bg-neutral-800 transition-colors"
              >
                Авторизоваться
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}