'use client';

import { useState, useEffect } from 'react';
import { videosApi, channelsApi } from '@/lib/api';
import type { VideoResponse, ChannelResponse } from '@/types';
import { VideoCard } from './VideoCard';
import { VideoDetail } from './VideoDetail';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { RefreshCw } from 'lucide-react';

export function VideoList() {
  const [videos, setVideos] = useState<VideoResponse[]>([]);
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<VideoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [videosData, channelsData] = await Promise.all([
        videosApi.list(selectedChannel ? parseInt(selectedChannel) : undefined),
        channelsApi.list(),
      ]);
      setVideos(videosData);
      setChannels(channelsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedChannel]);

  const channelOptions = [
    { value: '', label: 'All Channels' },
    ...channels.map((c) => ({ value: c.id.toString(), label: c.name })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <Button onClick={fetchData} variant="secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Select
            options={channelOptions}
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-48"
          />
          <p className="text-gray-600 dark:text-gray-400">{videos.length} videos</p>
        </div>
        <Button onClick={fetchData} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              onClick={() => setSelectedVideo(video)}
            />
          ))}
        </div>
      )}

      {selectedVideo && (
        <VideoDetail
          videoId={selectedVideo.video_id}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
