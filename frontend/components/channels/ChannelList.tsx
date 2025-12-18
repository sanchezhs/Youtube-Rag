'use client';

import { useState, useEffect } from 'react';
import { channelsApi } from '@/lib/api';
import type { ChannelResponse } from '@/types';
import { ChannelCard } from './ChannelCard';
import { CreateChannelModal } from './CreateChannelModal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, RefreshCw } from 'lucide-react';

export function ChannelList() {
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await channelsApi.list();
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleChannelCreated = (channel: ChannelResponse) => {
    setChannels((prev) => [...prev, channel]);
    setIsModalOpen(false);
  };

  const handleChannelDeleted = (channelId: number) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  };

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
        <Button onClick={fetchChannels} variant="secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">{channels.length} channels</p>
        <div className="flex gap-2">
          <Button onClick={fetchChannels} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No channels added yet</p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Channel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDeleted={handleChannelDeleted}
            />
          ))}
        </div>
      )}

      <CreateChannelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleChannelCreated}
      />
    </div>
  );
}
