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
    { label: 'Channels', value: stats.total_channels, icon: Youtube, color: 'text-red-500' },
    { label: 'Videos', value: stats.total_videos, icon: Video, color: 'text-blue-500' },
    { label: 'Downloaded', value: stats.videos_downloaded, icon: Download, color: 'text-green-500' },
    { label: 'Transcribed', value: stats.videos_transcribed, icon: FileText, color: 'text-purple-500' },
    { label: 'Chunks', value: stats.total_chunks, icon: Layers, color: 'text-orange-500' },
    { label: 'Embedded', value: stats.chunks_embedded, icon: Cpu, color: 'text-cyan-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 text-center">
            <item.icon className={`h-8 w-8 mx-auto mb-2 ${item.color}`} />
            <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
