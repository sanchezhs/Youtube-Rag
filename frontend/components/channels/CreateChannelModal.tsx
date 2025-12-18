'use client';

import { useState } from 'react';
import { channelsApi } from '@/lib/api';
import type { ChannelResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (channel: ChannelResponse) => void;
}

export function CreateChannelModal({ isOpen, onClose, onCreated }: CreateChannelModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a channel URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const channel = await channelsApi.create({ url: url.trim() });
      onCreated(channel);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add YouTube Channel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Channel URL"
          placeholder="https://www.youtube.com/@channelname"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={error || undefined}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Add Channel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
