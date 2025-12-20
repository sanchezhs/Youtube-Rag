'use client';

import { useState, useEffect } from 'react';
import { channelsApi, videosApi } from '@/lib/api';
import type { ChannelResponse, VideoResponse } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { 
  Youtube, 
  Check, 
  X, 
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Video,
  Layers
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

export type ChatScope = 'channel' | 'videos';

export interface ChatContext {
  channel: ChannelResponse | null;
  scope: ChatScope;
  selectedVideos: VideoResponse[];
}

interface ChatContextSelectorProps {
  context: ChatContext;
  onChange: (context: ChatContext) => void;
  disabled?: boolean;
}

const MAX_SELECTED_VIDEOS = 20;

export function ChatContextSelector({ context, onChange, disabled }: ChatContextSelectorProps) {
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [videos, setVideos] = useState<VideoResponse[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const data = await channelsApi.list();
        setChannels(data);
        
        if (data.length > 0 && !context.channel) {
          onChange({ ...context, channel: data[0] });
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []);

  // Fetch videos when channel changes
  useEffect(() => {
    if (!context.channel) {
      setVideos([]);
      return;
    }

    const fetchVideos = async () => {
      setLoadingVideos(true);
      try {
        const data = await videosApi.list(context.channel!.id, 0, 200);
        const transcribedVideos = data.filter(v => v.transcribed);
        setVideos(transcribedVideos);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchVideos();
  }, [context.channel?.id]);

  const handleChannelChange = (channelId: string) => {
    const channel = channels.find(c => c.id.toString() === channelId) || null;
    onChange({
      channel,
      scope: 'channel',
      selectedVideos: [],
    });
    setSearchQuery('');
  };

  const handleScopeChange = (scope: ChatScope) => {
    onChange({
      ...context,
      scope,
      selectedVideos: scope === 'channel' ? [] : context.selectedVideos,
    });
  };

  const handleVideoToggle = (video: VideoResponse) => {
    const isSelected = context.selectedVideos.some(v => v.video_id === video.video_id);
    
    if (isSelected) {
      onChange({
        ...context,
        selectedVideos: context.selectedVideos.filter(v => v.video_id !== video.video_id),
      });
    } else {
      if (context.selectedVideos.length >= MAX_SELECTED_VIDEOS) {
        return;
      }
      onChange({
        ...context,
        selectedVideos: [...context.selectedVideos, video],
      });
    }
  };

  const handleClearSelection = () => {
    onChange({
      ...context,
      selectedVideos: [],
    });
  };

  const getFilteredVideos = () => {
    if (!searchQuery.trim()) return videos;
    
    const query = searchQuery.toLowerCase();
    return videos.filter(v => 
      v.title?.toLowerCase().includes(query) ||
      v.video_id.toLowerCase().includes(query)
    );
  };

  const filteredVideos = getFilteredVideos();

  if (loadingChannels) {
    return (
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Spinner size="sm" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">No channels available. Please add a channel first.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Compact Header - Always visible */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Channel Selector */}
        <div className="flex items-center gap-2">
          <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
          <select
            value={context.channel?.id.toString() || ''}
            onChange={(e) => handleChannelChange(e.target.value)}
            disabled={disabled}
            className="text-sm font-medium bg-transparent border-none text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 cursor-pointer pr-6 max-w-[200px]"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.name}</option>
            ))}
          </select>
        </div>

        <span className="text-gray-300 dark:text-gray-600">|</span>

        {/* Scope Toggle */}
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => handleScopeChange('channel')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              context.scope === 'channel'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Layers className="h-3 w-3" />
            All ({videos.length})
          </button>
          <button
            onClick={() => handleScopeChange('videos')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              context.scope === 'videos'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Video className="h-3 w-3" />
            Selected ({context.selectedVideos.length})
          </button>
        </div>

        {/* Expand Button (only for video selection) */}
        {context.scope === 'videos' && (
          <>
            <div className="flex-1" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              {isExpanded ? 'Hide' : 'Select videos'}
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Selected Videos Pills (when scope is videos and collapsed) */}
      {context.scope === 'videos' && context.selectedVideos.length > 0 && !isExpanded && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {context.selectedVideos.slice(0, 5).map((video) => (
            <span
              key={video.video_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs"
            >
              <span className="max-w-[100px] truncate">
                {video.title || video.video_id}
              </span>
              <button
                onClick={() => handleVideoToggle(video)}
                disabled={disabled}
                className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {context.selectedVideos.length > 5 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 py-0.5">
              +{context.selectedVideos.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Expanded Video Selection */}
      {context.scope === 'videos' && isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={disabled}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {context.selectedVideos.length > 0 && (
              <button
                onClick={handleClearSelection}
                disabled={disabled}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Selected Videos Pills */}
          {context.selectedVideos.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {context.selectedVideos.map((video) => (
                <span
                  key={video.video_id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs"
                >
                  <span className="max-w-[120px] truncate">
                    {video.title || video.video_id}
                  </span>
                  <button
                    onClick={() => handleVideoToggle(video)}
                    disabled={disabled}
                    className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Video List */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            {loadingVideos ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No videos match your search' : 'No transcribed videos available'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredVideos.map((video) => {
                  const isSelected = context.selectedVideos.some(
                    (v) => v.video_id === video.video_id
                  );
                  const isDisabledItem = !isSelected && context.selectedVideos.length >= MAX_SELECTED_VIDEOS;

                  return (
                    <button
                      key={video.video_id}
                      onClick={() => handleVideoToggle(video)}
                      disabled={disabled || isDisabledItem}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 text-left transition-colors',
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                        isDisabledItem && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${video.video_id}/default.jpg`}
                        alt=""
                        className="w-12 h-9 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {video.title || 'Untitled Video'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {video.duration ? formatDuration(video.duration) : ''}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {context.selectedVideos.length >= MAX_SELECTED_VIDEOS && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Maximum of {MAX_SELECTED_VIDEOS} videos selected
            </p>
          )}
        </div>
      )}
    </div>
  );
}
