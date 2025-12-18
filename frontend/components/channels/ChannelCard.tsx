'use client';

import { useState } from 'react';
import { channelsApi } from '@/lib/api';
import type { ChannelResponse, ChannelWithStats } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ExternalLink, Trash2, Video, ChevronDown, ChevronUp } from 'lucide-react';

interface ChannelCardProps {
  channel: ChannelResponse;
  onDeleted: (channelId: number) => void;
}

export function ChannelCard({ channel, onDeleted }: ChannelCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState<ChannelWithStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !stats) {
      setLoadingStats(true);
      try {
        const data = await channelsApi.get(channel.id);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch channel stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    
    setDeleting(true);
    try {
      await channelsApi.delete(channel.id);
      onDeleted(channel.id);
    } catch (error) {
      console.error('Failed to delete channel:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{channel.name}</h3>
            <p className="text-sm text-gray-500">Added {formatDate(channel.created_at)}</p>
          </div>
          <div className="flex gap-1">
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              className="p-1.5"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <button
          onClick={handleExpand}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show details
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {loadingStats ? (
              <p className="text-sm text-gray-500">Loading stats...</p>
            ) : stats ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.video_count}</p>
                  <p className="text-xs text-gray-500">Videos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.downloaded_count}</p>
                  <p className="text-xs text-gray-500">Downloaded</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.transcribed_count}</p>
                  <p className="text-xs text-gray-500">Transcribed</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Failed to load stats</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
