'use client';

import { useState, useEffect } from 'react';
import { chatApi } from '@/lib/api';
import type { ChatSessionResponse } from '@/types';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { MessageSquare, Trash2 } from 'lucide-react';

interface ChatSessionListProps {
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function ChatSessionList({
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: ChatSessionListProps) {
  const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const data = await chatApi.listSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat session?')) {
      await onDeleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
        No chat history
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
        History
      </h3>
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => onSelectSession(session.id)}
          className={cn(
            'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
            currentSessionId === session.id
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
              : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          )}
        >
          <MessageSquare className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session.title || 'Untitled Chat'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {session.message_count} messages
            </p>
          </div>
          <button
            onClick={(e) => handleDelete(e, session.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
          >
            <Trash2 className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
