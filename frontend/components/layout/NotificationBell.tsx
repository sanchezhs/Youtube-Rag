'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearAll = () => {
    if (confirm('Clear all notifications?')) {
      clearAll();
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className={cn('h-5 w-5', isConnected ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600')} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  Reconnecting...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  You&apos;ll be notified when tasks complete or fail
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                      !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm',
                              !notification.read
                                ? 'font-semibold text-gray-900 dark:text-gray-100'
                                : 'text-gray-700 dark:text-gray-300'
                            )}
                          >
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Delete"
                            >
                              <X className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatDateTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` • ${unreadCount} unread`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
