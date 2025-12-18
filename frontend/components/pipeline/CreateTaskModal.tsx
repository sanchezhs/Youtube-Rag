'use client';

import { useState } from 'react';
import { pipelineApi } from '@/lib/api';
import type { TaskType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const taskTypeOptions = [
  { value: 'pipeline', label: 'Full Pipeline' },
  { value: 'embed_question', label: 'Embed Question' },
];

export function CreateTaskModal({ isOpen, onClose, onCreated }: CreateTaskModalProps) {
  const [taskType, setTaskType] = useState<TaskType>('pipeline');
  const [channelUrl, setChannelUrl] = useState('');
  const [maxVideos, setMaxVideos] = useState('10');
  const [questionToEmbed, setQuestionToEmbed] = useState('');
  const [download, setDownload] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await pipelineApi.createTask({
        task_type: taskType,
        channel_url: channelUrl || undefined,
        max_videos: parseInt(maxVideos) || 10,
        question_to_embed: taskType === 'embed_question' ? questionToEmbed : undefined,
        download,
      });
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTaskType('pipeline');
    setChannelUrl('');
    setMaxVideos('10');
    setQuestionToEmbed('');
    setDownload(true);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Pipeline Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Task Type"
          options={taskTypeOptions}
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
        />

        {taskType === 'pipeline' && (
          <>
            <Input
              label="Channel URL (optional)"
              placeholder="https://www.youtube.com/@channelname"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
            />
            <Input
              label="Max Videos"
              type="number"
              min="1"
              max="100"
              value={maxVideos}
              onChange={(e) => setMaxVideos(e.target.value)}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={download}
                onChange={(e) => setDownload(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Download videos</span>
            </label>
          </>
        )}

        {taskType === 'embed_question' && (
          <Input
            label="Question to Embed"
            placeholder="Enter the question..."
            value={questionToEmbed}
            onChange={(e) => setQuestionToEmbed(e.target.value)}
          />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
