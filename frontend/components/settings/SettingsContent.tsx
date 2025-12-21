// components/settings/SettingsContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/lib/theme';
import { useSettings } from '@/hooks/useSettings';
import type { SettingValueType } from '@/types';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Settings, 
  Palette,
  Server,
  Cpu,
  Info,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  SplitSquareHorizontal,
  Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SaveStatusType = 'idle' | 'saving' | 'success' | 'error';

interface SaveStatus {
  section: string;
  status: SaveStatusType;
  message?: string;
}

interface SettingToSave {
  section: string;
  key: string;
  value: string | number | boolean;
  value_type: SettingValueType;
}

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  
  // Backend settings (RAG, LLM)
  const { 
    settings: backendSettings, 
    isLoading: backendLoading, 
    error: backendError, 
    getSetting: getBackendSetting,
    bulkUpdate: bulkUpdateBackend,
    refetch: refetchBackend 
  } = useSettings('BACKEND');

  // Worker settings (Transcription, Embedding, Chunking)
  const { 
    settings: workerSettings, 
    isLoading: workerLoading, 
    error: workerError, 
    getSetting: getWorkerSetting,
    bulkUpdate: bulkUpdateWorker,
    refetch: refetchWorker 
  } = useSettings('WORKER');

  const isLoading = backendLoading || workerLoading;
  const error = backendError || workerError;

  const refetch = async () => {
    await Promise.all([refetchBackend(), refetchWorker()]);
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ section: '', status: 'idle' });

  // RAG Settings (Backend)
  const [ragConfig, setRagConfig] = useState({
    topK: '8',
    textWeight: '0.3',
    vectorWeight: '0.7',
  });

  // LLM Settings (Backend)
  const [llmConfig, setLlmConfig] = useState({
    model: 'gpt-4o-mini',
    temperature: '0.2',
    prompt: 'You are a helpful assistant',
  });

  // Transcription Settings (Worker)
  const [transcriptionConfig, setTranscriptionConfig] = useState({
    computeType: 'float16',
    device: 'cuda',
  });
  
  // Embedding Settings (Worker)
  const [embeddingConfig, setEmbeddingConfig] = useState({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    batchSize: '32',
  });
  
  // Chunking Settings (Worker)
  const [chunkingConfig, setChunkingConfig] = useState({
    targetTokens: '512',
    overlapTokens: '100',
    avgCharsPerToken: '4',
  });

  // Load backend settings
  useEffect(() => {
    if (!backendLoading && backendSettings && Object.keys(backendSettings).length > 0) {
      setRagConfig({
        topK: String(getBackendSetting('rag_top_k', 8)),
        textWeight: String(getBackendSetting('rag_text_weight', 0.3)),
        vectorWeight: String(getBackendSetting('rag_vector_weight', 0.7)),
      });
      
      setLlmConfig({
        model: String(getBackendSetting('llm_model', 'gpt-4o-mini')),
        temperature: String(getBackendSetting('llm_temperature', 0.2)),
        prompt: String(getBackendSetting('llm_prompt', 'You are a helpful assistant')),
      });
    }
  }, [backendLoading, backendSettings, getBackendSetting]);

  // Load worker settings
  useEffect(() => {
    if (!workerLoading && workerSettings && Object.keys(workerSettings).length > 0) {
      setTranscriptionConfig({
        computeType: String(getWorkerSetting('whisper_compute_type', 'float16')),
        device: String(getWorkerSetting('whisper_device', 'gpu')),
      });
      
      setEmbeddingConfig({
        model: String(getWorkerSetting('embedding_model', 'sentence-transformers/all-MiniLM-L6-v2')),
        batchSize: String(getWorkerSetting('embedding_batch_size', 32)),
      });
      
      setChunkingConfig({
        targetTokens: String(getWorkerSetting('target_tokens', 512)),
        overlapTokens: String(getWorkerSetting('overlap_tokens', 100)),
        avgCharsPerToken: String(getWorkerSetting('avg_chars_per_token', 4)),
      });
    }
  }, [workerLoading, workerSettings, getWorkerSetting]);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light mode for bright environments' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark mode for low-light environments' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Automatically match your system preference' },
  ] as const;

  const handleSave = async (
    section: string,
    bulkUpdateFn: typeof bulkUpdateBackend,
    settingsToSave: SettingToSave[]
  ) => {
    setSaveStatus({ section, status: 'saving' });
    
    try {
      const success = await bulkUpdateFn(settingsToSave);
      
      if (success) {
        setSaveStatus({ section, status: 'success', message: 'Settings saved!' });
        setTimeout(() => setSaveStatus({ section: '', status: 'idle' }), 2000);
      } else {
        setSaveStatus({ section, status: 'error', message: 'Failed to save settings' });
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus({ 
        section, 
        status: 'error', 
        message: err instanceof Error ? err.message : 'An error occurred' 
      });
    }
  };

  const saveRagConfig = () => handleSave('rag', bulkUpdateBackend, [
    { section: 'rag', key: 'rag_top_k', value: parseInt(ragConfig.topK, 10), value_type: 'int' },
    { section: 'rag', key: 'rag_text_weight', value: parseFloat(ragConfig.textWeight), value_type: 'float' },
    { section: 'rag', key: 'rag_vector_weight', value: parseFloat(ragConfig.vectorWeight), value_type: 'float' },
  ]);

  const saveLlmConfig = () => handleSave('llm', bulkUpdateBackend, [
    { section: 'llm', key: 'llm_model', value: llmConfig.model, value_type: 'string' },
    { section: 'llm', key: 'llm_system_prompt', value: llmConfig.prompt, value_type: 'string' },
    { section: 'llm', key: 'llm_temperature', value: llmConfig.temperature, value_type: 'float' },
  ]);

  const saveTranscriptionConfig = () => handleSave('transcribing', bulkUpdateWorker, [
    { section: 'transcribing', key: 'whisper_compute_type', value: transcriptionConfig.computeType, value_type: 'string' },
    { section: 'transcribing', key: 'whisper_device', value: transcriptionConfig.device, value_type: 'string' },
  ]);

  const saveEmbeddingConfig = () => handleSave('embedding', bulkUpdateWorker, [
    { section: 'embedding', key: 'embedding_model', value: embeddingConfig.model, value_type: 'string' },
    { section: 'embedding', key: 'embedding_batch_size', value: parseInt(embeddingConfig.batchSize, 10), value_type: 'int' },
  ]);

  const saveChunkingConfig = () => handleSave('chunking', bulkUpdateWorker, [
    { section: 'chunking', key: 'target_tokens', value: parseInt(chunkingConfig.targetTokens, 10), value_type: 'int' },
    { section: 'chunking', key: 'overlap_tokens', value: parseInt(chunkingConfig.overlapTokens, 10), value_type: 'int' },
    { section: 'chunking', key: 'avg_chars_per_token', value: parseInt(chunkingConfig.avgCharsPerToken, 10), value_type: 'int' },
  ]);

  const getSaveButtonProps = (section: string) => {
    const isCurrentSection = saveStatus.section === section;
    const status = isCurrentSection ? saveStatus.status : 'idle';

    const getVariant = (): 'primary' | 'secondary' | 'danger' => {
      if (status === 'error') return 'danger';
      if (status === 'success') return 'secondary';
      return 'primary';
    };

    const getIcon = () => {
      if (status === 'success') return <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />;
      if (status === 'error') return <AlertCircle className="h-4 w-4 mr-2" />;
      return <Save className="h-4 w-4 mr-2" />;
    };

    const getText = () => {
      if (status === 'saving') return 'Saving...';
      if (status === 'success') return 'Saved!';
      if (status === 'error') return 'Error';
      return 'Save';
    };

    return {
      variant: getVariant(),
      loading: status === 'saving',
      icon: status !== 'saving' ? getIcon() : null,
      text: getText(),
      className: status === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : undefined,
    };
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-600 dark:text-red-400">Failed to load settings: {error}</p>
              </div>
              <Button variant="secondary" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Appearance
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize how the application looks
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    theme === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      theme === option.value
                        ? 'bg-primary-100 dark:bg-primary-900/40'
                        : 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <option.icon
                      className={cn(
                        'h-6 w-6',
                        theme === option.value
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'font-medium',
                        theme === option.value
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG Settings - Backend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  RAG Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure retrieval-augmented generation parameters
                </p>
              </div>
            </div>
            {(() => {
              const props = getSaveButtonProps('rag');
              return (
                <Button
                  size="sm"
                  variant={props.variant}
                  loading={props.loading}
                  onClick={saveRagConfig}
                  className={props.className}
                >
                  {props.icon}
                  {props.text}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Top K Results
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={ragConfig.topK}
                onChange={(e) => setRagConfig(prev => ({ ...prev, topK: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of results to retrieve
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Text Weight
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={ragConfig.textWeight}
                onChange={(e) => setRagConfig(prev => ({ ...prev, textWeight: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Weight for text search (0-1)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vector Weight
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={ragConfig.vectorWeight}
                onChange={(e) => setRagConfig(prev => ({ ...prev, vectorWeight: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Weight for vector search (0-1)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LLM Settings - Backend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Cpu className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  LLM Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure the language model for chat
                </p>
              </div>
            </div>
            {(() => {
              const props = getSaveButtonProps('llm');
              return (
                <Button
                  size="sm"
                  variant={props.variant}
                  loading={props.loading}
                  onClick={saveLlmConfig}
                  className={props.className}
                >
                  {props.icon}
                  {props.text}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model
                </label>
                <select
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Temperature
                </label>
                <Input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={llmConfig.temperature}
                  onChange={(e) => setLlmConfig(prev => ({ ...prev, temperature: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Controls randomness (0-2)
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                System Prompt
              </label>
              <textarea
                value={llmConfig.prompt}
                onChange={(e) => setLlmConfig(prev => ({ ...prev, prompt: e.target.value }))}
                rows={4}
                className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="You are a helpful assistant..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Instructions given to the model before each conversation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Settings - Worker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Mic className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Transcription Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure Whisper transcription parameters
                </p>
              </div>
            </div>
            {(() => {
              const props = getSaveButtonProps('transcribing');
              return (
                <Button
                  size="sm"
                  variant={props.variant}
                  loading={props.loading}
                  onClick={saveTranscriptionConfig}
                  className={props.className}
                >
                  {props.icon}
                  {props.text}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Compute Type
              </label>
              <select
                value={transcriptionConfig.computeType}
                onChange={(e) => setTranscriptionConfig(prev => ({ ...prev, computeType: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="float32">float32 (Highest Precision)</option>
                <option value="float16">float16 (Balanced)</option>
                <option value="int8">int8 (Fastest)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Device
              </label>
              <select
                value={transcriptionConfig.device}
                onChange={(e) => setTranscriptionConfig(prev => ({ ...prev, device: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="gpu">GPU (CUDA)</option>
                <option value="cpu">CPU</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding Settings - Worker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Embedding Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure text embedding parameters
                </p>
              </div>
            </div>
            {(() => {
              const props = getSaveButtonProps('embedding');
              return (
                <Button
                  size="sm"
                  variant={props.variant}
                  loading={props.loading}
                  onClick={saveEmbeddingConfig}
                  className={props.className}
                >
                  {props.icon}
                  {props.text}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Embedding Model
              </label>
              <select
                value={embeddingConfig.model}
                onChange={(e) => setEmbeddingConfig(prev => ({ ...prev, model: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Fast)</option>
                <option value="sentence-transformers/all-mpnet-base-v2">all-mpnet-base-v2 (Balanced)</option>
                <option value="BAAI/bge-small-en-v1.5">BGE Small (Efficient)</option>
                <option value="BAAI/bge-base-en-v1.5">BGE Base (Quality)</option>
                <option value="BAAI/bge-large-en-v1.5">BGE Large (Best)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Batch Size
              </label>
              <Input
                type="number"
                min="1"
                max="256"
                value={embeddingConfig.batchSize}
                onChange={(e) => setEmbeddingConfig(prev => ({ ...prev, batchSize: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of texts to embed at once
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chunking Settings - Worker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <SplitSquareHorizontal className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Chunking Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure text chunking parameters
                </p>
              </div>
            </div>
            {(() => {
              const props = getSaveButtonProps('chunking');
              return (
                <Button
                  size="sm"
                  variant={props.variant}
                  loading={props.loading}
                  onClick={saveChunkingConfig}
                  className={props.className}
                >
                  {props.icon}
                  {props.text}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Tokens
              </label>
              <Input
                type="number"
                min="64"
                max="2048"
                value={chunkingConfig.targetTokens}
                onChange={(e) => setChunkingConfig(prev => ({ ...prev, targetTokens: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target tokens per chunk
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overlap Tokens
              </label>
              <Input
                type="number"
                min="0"
                max="512"
                value={chunkingConfig.overlapTokens}
                onChange={(e) => setChunkingConfig(prev => ({ ...prev, overlapTokens: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Overlap between chunks
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Avg Chars/Token
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={chunkingConfig.avgCharsPerToken}
                onChange={(e) => setChunkingConfig(prev => ({ ...prev, avgCharsPerToken: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Average characters per token
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Server className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Server Status
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View server configuration
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">API Endpoint</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Backend Settings</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {Object.keys(backendSettings).length} keys
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Worker Settings</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {Object.keys(workerSettings).length} keys
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                About
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Application information
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Application</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">YouTube RAG</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Framework</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Next.js 15</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">UI</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tailwind CSS 4</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Settings className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Irreversible actions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Clear All Data
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Delete all channels, videos, and chat history
                </p>
              </div>
              <Button variant="danger" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Reset Settings
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reset all settings to default values
                </p>
              </div>
              <Button variant="danger" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
