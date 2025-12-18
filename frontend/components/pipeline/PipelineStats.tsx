'use client';

import { useState, useEffect } from 'react';
import { pipelineApi } from '@/lib/api';
import type { PipelineStatsResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Youtube, Video, Download, FileText, Layers, Cpu } from 'lucide-react';

export function PipelineStats() {
  const [stats, setStats] = useState<PipelineStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await pipelineApi.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch pipeline stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    { 
      label: 'Channels', 
      value: stats.total_channels, 
      icon: Youtube, 
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    { 
      label: 'Videos', 
      value: stats.total_videos, 
      icon: Video, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      label: 'Downloaded', 
      value: stats.videos_downloaded, 
      icon: Download, 
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    { 
      label: 'Transcribed', 
      value: stats.videos_transcribed, 
      icon: FileText, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    { 
      label: 'Chunks', 
      value: stats.total_chunks, 
      icon: Layers, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    },
    { 
      label: 'Embedded', 
      value: stats.chunks_embedded, 
      icon: Cpu, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <div className={`inline-flex p-2 rounded-lg ${item.bgColor} mb-2`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {item.value.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
