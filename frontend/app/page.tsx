'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PipelineStats } from '@/components/pipeline/PipelineStats';
import { pipelineApi, channelsApi, videosApi } from '@/lib/api';
import type { PipelineStatsResponse, ChannelResponse, VideoResponse } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import { ArrowRight, Youtube, Video, MessageSquare, Play } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<PipelineStatsResponse | null>(null);
  const [recentChannels, setRecentChannels] = useState<ChannelResponse[]>([]);
  const [pendingVideos, setPendingVideos] = useState<VideoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, channelsData, pendingData] = await Promise.all([
          pipelineApi.getStats(),
          channelsApi.list(0, 5),
          videosApi.getPendingDownload(),
        ]);
        setStats(statsData);
        setRecentChannels(channelsData);
        setPendingVideos(pendingData.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Dashboard" subtitle="Overview of YT-RAG" />
      
      <div className="p-6 space-y-6">
        {/* Stats */}
        <PipelineStats />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/channels">
            <Card className="hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Manage Channels</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add/remove channels</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/videos">
            <Card className="hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Browse Videos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View all videos</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/pipeline">
            <Card className="hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Run Pipeline</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start ingestion</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/chat">
            <Card className="hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Start Chat</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Channels */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Channels</h3>
                <Link 
                  href="/channels" 
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentChannels.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No channels added yet
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentChannels.map((channel) => (
                    <div 
                      key={channel.id} 
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">{channel.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{channel.url}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Downloads */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pending Downloads</h3>
                <Link 
                  href="/videos" 
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingVideos.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No pending downloads
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingVideos.map((video) => (
                    <div 
                      key={video.video_id} 
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {video.title || 'Untitled Video'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{video.video_id}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
