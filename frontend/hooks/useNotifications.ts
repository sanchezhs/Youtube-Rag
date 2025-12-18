'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSSEUrl } from '@/lib/api';
import type { Notification, SSETaskUpdate } from '@/types';

const STORAGE_KEY = 'youtube-rag-notifications';
const MAX_NOTIFICATIONS = 50;

// Get notifications from localStorage
function getStoredNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save notifications to localStorage
function saveNotifications(notifications: Notification[]): void {
  if (typeof window === 'undefined') return;
  
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial notifications from storage
  useEffect(() => {
    setNotifications(getStoredNotifications());
  }, []);

  // Add a new notification
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(updated);
      return updated;
    });

    return newNotification;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle SSE task update
  const handleTaskUpdate = useCallback((data: SSETaskUpdate) => {
    const { task } = data;
    
    if (task.status === 'completed') {
      addNotification({
        type: 'success',
        title: 'Task Completed',
        message: `Pipeline task "${task.task_type}" completed successfully.`,
        taskId: task.id,
        taskType: task.task_type,
      });
    } else if (task.status === 'failed') {
      addNotification({
        type: 'error',
        title: 'Task Failed',
        message: `Pipeline task "${task.task_type}" failed: ${task.error_message || 'Unknown error'}`,
        taskId: task.id,
        taskType: task.task_type,
      });
    }
  }, [addNotification]);

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(getSSEUrl());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        setIsConnected(true);
      };

      eventSource.addEventListener('connected', (event) => {
        console.log('SSE connection confirmed:', event.data);
      });

      eventSource.addEventListener('task_update', (event) => {
        try {
          const data = JSON.parse(event.data) as SSETaskUpdate;
          handleTaskUpdate(data);
        } catch (error) {
          console.error('Failed to parse task update:', error);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received, connection is alive
      });

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnected(false);
        eventSource.close();
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect SSE...');
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setIsConnected(false);
    }
  }, [handleTaskUpdate]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
