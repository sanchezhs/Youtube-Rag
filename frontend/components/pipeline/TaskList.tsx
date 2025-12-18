'use client';

import { useState, useEffect } from 'react';
import { pipelineApi } from '@/lib/api';
import type { PipelineTaskResponse, TaskStatus } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { 
  RefreshCw, 
  Info, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const statusVariants: Record<TaskStatus, 'default' | 'info' | 'success' | 'danger'> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'danger',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  running: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

interface TaskStepInfo {
  step?: string;
  current_step?: number;
  total_steps?: number;
  message?: string;
  details?: string;
  video_id?: string;
  video_title?: string;
  channel?: string;
  processed?: number;
  total?: number;
  [key: string]: unknown;
}

interface ParsedResult {
  type: 'step_info' | 'embedding' | 'text' | 'unknown';
  data: TaskStepInfo | null;
  rawPreview?: string;
}

function parseTaskResult(result: string | null | undefined): ParsedResult {
  if (!result) {
    return { type: 'unknown', data: null };
  }

  // Check if it looks like an embedding (starts with { followed by numbers)
  // Embeddings look like: {-0.020788,0.050129,...} or [-0.020788,0.050129,...]
  const embeddingPattern = /^[\[{]-?\d+\.\d+,/;
  if (embeddingPattern.test(result.trim())) {
    return { 
      type: 'embedding', 
      data: null,
      rawPreview: result.length > 100 ? `${result.slice(0, 100)}...` : result
    };
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(result);
    
    // Check if it's an array of numbers (embedding in JSON format)
    if (Array.isArray(parsed) && typeof parsed[0] === 'number') {
      return { 
        type: 'embedding', 
        data: null,
        rawPreview: `[${parsed.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...] (${parsed.length} dimensions)`
      };
    }
    
    // It's a regular JSON object (step info)
    return { type: 'step_info', data: parsed as TaskStepInfo };
  } catch {
    // Not JSON, return as text
    return { 
      type: 'text', 
      data: { message: result },
      rawPreview: result.length > 200 ? `${result.slice(0, 200)}...` : result
    };
  }
}

function TaskStepDisplay({ stepInfo }: { stepInfo: TaskStepInfo }) {
  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Step name/title */}
          {stepInfo.step && (
            <p className="font-medium text-blue-900 text-sm">
              {stepInfo.step}
            </p>
          )}
          
          {/* Step progress (e.g., Step 2 of 5) */}
          {stepInfo.current_step !== undefined && stepInfo.total_steps !== undefined && (
            <p className="text-xs text-blue-700 mt-0.5">
              Step {stepInfo.current_step} of {stepInfo.total_steps}
            </p>
          )}
          
          {/* Message */}
          {stepInfo.message && (
            <p className="text-sm text-blue-800 mt-1">
              {stepInfo.message}
            </p>
          )}
          
          {/* Details */}
          {stepInfo.details && (
            <p className="text-xs text-blue-600 mt-1">
              {stepInfo.details}
            </p>
          )}
          
          {/* Video info if available */}
          {(stepInfo.video_id || stepInfo.video_title) && (
            <div className="mt-2 text-xs text-blue-600">
              {stepInfo.video_title && (
                <p className="truncate">Video: {stepInfo.video_title}</p>
              )}
              {stepInfo.video_id && !stepInfo.video_title && (
                <p>Video ID: {stepInfo.video_id}</p>
              )}
            </div>
          )}
          
          {/* Channel info if available */}
          {stepInfo.channel && (
            <p className="text-xs text-blue-600 mt-1">
              Channel: {stepInfo.channel}
            </p>
          )}
          
          {/* Processed count if available */}
          {stepInfo.processed !== undefined && stepInfo.total !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                <span>Processing</span>
                <span>{stepInfo.processed} / {stepInfo.total}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ 
                    width: `${stepInfo.total > 0 ? (stepInfo.processed / stepInfo.total) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmbeddingResultDisplay({ preview, fullResult }: { preview: string; fullResult: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-purple-900 text-sm">
              Embedding Vector Generated
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-purple-200 transition-colors"
                title="Copy embedding"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-purple-500" />
                )}
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded hover:bg-purple-200 transition-colors"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-purple-500" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-purple-500" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-1 font-mono">
            {preview}
          </p>
          {expanded && (
            <div className="mt-2 p-2 bg-purple-100 rounded text-xs font-mono text-purple-800 max-h-32 overflow-auto break-all">
              {fullResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedResultDisplay({ stepInfo }: { stepInfo: TaskStepInfo }) {
  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
      <div className="flex items-start gap-2">
        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {stepInfo.message && (
            <p className="text-sm text-green-800">
              {stepInfo.message}
            </p>
          )}
          {stepInfo.processed !== undefined && (
            <p className="text-xs text-green-600 mt-1">
              Processed: {stepInfo.processed} items
            </p>
          )}
          {/* Display any other relevant completion info */}
          {Object.entries(stepInfo).map(([key, value]) => {
            if (['message', 'processed', 'step', 'current_step', 'total_steps'].includes(key)) {
              return null;
            }
            if (value !== null && value !== undefined && typeof value !== 'object') {
              return (
                <p key={key} className="text-xs text-green-600 mt-0.5">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {String(value)}
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

function TextResultDisplay({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;
  
  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 break-words">
            {expanded || !isLong ? text : `${text.slice(0, 200)}...`}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary-600 hover:text-primary-700 mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskResultDisplay({ result, status }: { result: string | null | undefined; status: TaskStatus }) {
  const parsed = parseTaskResult(result);
  
  if (parsed.type === 'unknown' || !result) {
    return null;
  }
  
  if (parsed.type === 'embedding') {
    return (
      <EmbeddingResultDisplay 
        preview={parsed.rawPreview || 'Embedding data'} 
        fullResult={result} 
      />
    );
  }
  
  if (parsed.type === 'step_info' && parsed.data) {
    if (status === 'running') {
      return <TaskStepDisplay stepInfo={parsed.data} />;
    }
    if (status === 'completed') {
      return <CompletedResultDisplay stepInfo={parsed.data} />;
    }
  }
  
  if (parsed.type === 'text' && parsed.rawPreview) {
    return <TextResultDisplay text={result} />;
  }
  
  return null;
}

interface DeleteConfirmProps {
  isOpen: boolean;
  taskId: string;
  taskType: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({ isOpen, taskId, taskType, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
        </div>
        <p className="text-gray-600 mb-2">
          Are you sure you want to delete this task?
        </p>
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-medium">Type:</span> {taskType}<br />
          <span className="font-medium">ID:</span> {taskId.slice(0, 8)}...
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TaskList() {
  const [tasks, setTasks] = useState<PipelineTaskResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; task: PipelineTaskResponse | null }>({
    isOpen: false,
    task: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await pipelineApi.listTasks(
        statusFilter ? (statusFilter as TaskStatus) : undefined
      );
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleDeleteClick = (task: PipelineTaskResponse) => {
    setDeleteConfirm({ isOpen: true, task });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.task) return;

    setIsDeleting(true);
    try {
      await pipelineApi.deleteTask(deleteConfirm.task.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteConfirm.task?.id));
      setDeleteConfirm({ isOpen: false, task: null });
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, task: null });
  };

  // Check if a task can be deleted (not running)
  const canDeleteTask = (task: PipelineTaskResponse) => {
    return task.status !== 'running';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Pipeline Tasks</h2>
          <div className="flex items-center gap-2">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            />
            <Button variant="ghost" size="sm" onClick={fetchTasks}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Spinner />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariants[task.status]}>
                        <span className="flex items-center gap-1.5">
                          {statusIcons[task.status]}
                          {task.status}
                        </span>
                      </Badge>
                      <span className="font-medium text-gray-900">{task.task_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatDateTime(task.created_at)}
                      </span>
                      <button
                        onClick={() => handleDeleteClick(task)}
                        disabled={!canDeleteTask(task)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          canDeleteTask(task)
                            ? 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                            : 'text-gray-200 cursor-not-allowed'
                        }`}
                        title={canDeleteTask(task) ? 'Delete task' : 'Cannot delete running task'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Task ID */}
                  <p className="text-xs text-gray-400 mb-2 font-mono">
                    ID: {task.id}
                  </p>
                  
                  {/* Progress bar for running tasks */}
                  {task.status === 'running' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Result display - handles all types including embeddings */}
                  <TaskResultDisplay result={task.result} status={task.status} />

                  {/* Error message for failed tasks */}
                  {task.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 break-words">{task.error_message}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Time info */}
                  {(task.started_at || task.completed_at) && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      {task.started_at && (
                        <span>Started: {formatDateTime(task.started_at)}</span>
                      )}
                      {task.completed_at && (
                        <span>Completed: {formatDateTime(task.completed_at)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        taskId={deleteConfirm.task?.id || ''}
        taskType={deleteConfirm.task?.task_type || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </>
  );
}
