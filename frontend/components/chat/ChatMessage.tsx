'use client';

import { useState } from 'react';
import type { ChatMessageResponse, ChatSource } from '@/types';
import { cn } from '@/lib/utils';
import { User, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { SourceCard } from './SourceCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageResponse;
  defaultSourcesCollapsed?: boolean;
}

function parseMessageSources(sources: string | null | undefined): ChatSource[] {
  if (!sources) return [];
  
  try {
    const parsed = JSON.parse(sources);
    if (Array.isArray(parsed)) {
      return parsed as ChatSource[];
    }
    return [];
  } catch {
    return [];
  }
}

export function ChatMessage({ message, defaultSourcesCollapsed = true }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const sources = parseMessageSources(message.sources);
  const [showSources, setShowSources] = useState(!defaultSourcesCollapsed);

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>
      <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          >
            {message.content || '...'}
          </ReactMarkdown>
        </div>

        {/* Sources section for assistant messages */}
        {!isUser && sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
            >
              {showSources ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide sources ({sources.length})
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show sources ({sources.length})
                </>
              )}
            </button>
            
            {showSources && (
              <div className="flex flex-wrap gap-2">
                {sources.map((source, index) => (
                  <SourceCard key={`${source.video_id}-${source.start}-${index}`} source={source} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
