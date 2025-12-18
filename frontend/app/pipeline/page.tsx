'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PipelineStats } from '@/components/pipeline/PipelineStats';
import { TaskList } from '@/components/pipeline/TaskList';
import { CreateTaskModal } from '@/components/pipeline/CreateTaskModal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function PipelinePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Pipeline" 
        subtitle="Manage ingestion and processing tasks" 
      />
      <div className="p-6 space-y-6">
        <PipelineStats key={`stats-${refreshKey}`} />
        
        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>

        <TaskList key={`tasks-${refreshKey}`} />

        <CreateTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleTaskCreated}
        />
      </div>
    </div>
  );
}
