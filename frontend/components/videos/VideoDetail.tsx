'use client';

import { useState, useEffect } from 'react';
import { videosApi } from '@/lib/api';
import type { VideoDetail as VideoDetailType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatDuration } from '@/lib/utils';
import { ExternalLink, Download, FileText, Layers, Clock } from 'lucide-react';

interface VideoDetailProps {
  videoId: string;
  onClose: () => void;
}

export function VideoDetail({ videoId, onClose }: VideoDetailProps) {
  const [video, setVideo] = useState<VideoDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const data = await videosApi.get(videoId);
        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch video details');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  return (
    <Modal isOpen={true} onClose={onClose} title="Video Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      ) : video ? (
        <div className="space-y-6">
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={`https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
              alt={video.title || 'Video thumbnail'}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {video.title || 'Untitled Video'}
            </h3>
            {video.description && (
              <p className="text-sm text-gray-600 line-clamp-3">{video.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Duration: {formatDuration(video.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Layers className="h-4 w-4" />
              <span>{video.chunk_count} chunks, {video.segment_count} segments</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={video.downloaded ? 'success' : 'warning'}>
              <Download className="h-3 w-3 mr-1" />
              {video.downloaded ? 'Downloaded' : 'Not Downloaded'}
            </Badge>
            <Badge variant={video.transcribed ? 'success' : 'warning'}>
              <FileText className="h-3 w-3 mr-1" />
              {video.transcribed ? 'Transcribed' : 'Not Transcribed'}
            </Badge>
          </div>

          <div className="pt-4 border-t">
            <a
              href={`https://www.youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Watch on YouTube
            </a>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
