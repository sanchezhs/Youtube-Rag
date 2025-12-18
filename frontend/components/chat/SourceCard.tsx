'use client';

import type { ChatSource } from '@/types';
import { formatDuration } from '@/lib/utils';
import { ExternalLink, Clock, Play } from 'lucide-react';

interface SourceCardProps {
  source: ChatSource;
  compact?: boolean;
}

export function SourceCard({ source, compact = false }: SourceCardProps) {
  const thumbnailUrl = `https://img.youtube.com/vi/${source.video_id}/default.jpg`;
  const relevancePercent = Math.round(source.score * 100);

  if (compact) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-xs text-gray-700 dark:text-gray-300 transition-colors"
      >
        <Play className="h-3 w-3" />
        <span>{formatDuration(Math.floor(source.start))}</span>
        <span className="text-gray-400 dark:text-gray-500">•</span>
        <span className="text-green-600 dark:text-green-400">{relevancePercent}%</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-44 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
    >
      <div className="relative">
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-20 object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
          <Play className="h-2.5 w-2.5" />
          {formatDuration(Math.floor(source.start))}
        </div>
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(Math.floor(source.start))} - {formatDuration(Math.floor(source.end))}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${relevancePercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{relevancePercent}%</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate font-mono">
          {source.video_id}
        </p>
      </div>
    </a>
  );
}
