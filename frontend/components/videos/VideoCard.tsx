'use client';

import type { VideoResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDuration } from '@/lib/utils';
import { Calendar, Download, FileText } from 'lucide-react';

interface VideoCardProps {
  video: VideoResponse;
  onClick: () => void;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow" 
      onClick={onClick}
    >
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
        <img
          src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
          alt={video.title || 'Video thumbnail'}
          className="w-full h-full object-cover"
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2 mb-2">
          {video.title || 'Untitled Video'}
        </h3>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Calendar className="h-3 w-3" />
          <span>{video.published_at ? formatDate(video.published_at) : 'Unknown'}</span>
        </div>

        <div className="flex gap-2">
          <Badge variant={video.downloaded ? 'success' : 'default'}>
            <Download className="h-3 w-3 mr-1" />
            {video.downloaded ? 'Downloaded' : 'Pending'}
          </Badge>
          <Badge variant={video.transcribed ? 'success' : 'default'}>
            <FileText className="h-3 w-3 mr-1" />
            {video.transcribed ? 'Transcribed' : 'Pending'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
