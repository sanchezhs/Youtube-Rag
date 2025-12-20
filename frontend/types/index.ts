// Channel Types
export interface ChannelResponse {
  id: number;
  name: string;
  url: string;
  created_at: string;
  updated_at?: string | null;
}

export interface ChannelWithStats extends ChannelResponse {
  video_count: number;
  downloaded_count: number;
  transcribed_count: number;
}

export interface ChannelCreate {
  url: string;
}

export interface ChannelUpdate {
  name?: string | null;
}

// Video Types
export interface VideoResponse {
  video_id: string;
  title?: string | null;
  description?: string | null;
  channel_id: number;
  published_at?: string | null;
  duration?: number | null;
  downloaded: boolean;
  transcribed: boolean;
  created_at: string;
}

export interface VideoDetail extends VideoResponse {
  audio_path?: string | null;
  chunk_count: number;
  segment_count: number;
}

// Chat Types
export interface ChatSessionResponse {
  id: string;
  title?: string | null;
  channel_id: number;
  created_at: string;
  message_count: number;
}

export interface ChatMessageResponse {
  id: number;
  role: string;
  content: string;
  created_at: string;
  sources?: string | null;
}

export interface ChatSessionDetail extends ChatSessionResponse {
  messages: ChatMessageResponse[];
  videos: VideoResponse[];
}

export interface ChatSource {
  video_id: string;
  start: number;
  end: number;
  url: string;
  score: number;
}

export interface AskRequest {
  question: string;
  channel_id: number;
  video_ids?: string[];
  session_id?: string | null;
}

export interface AskResponse {
  answer: string;
  sources: ChatSource[];
  session_id: string;
  channel_id: number;
  video_ids: string[];
}

// Pipeline Types
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskType = 'pipeline' | 'embed_question';

export interface PipelineStatsResponse {
  total_channels: number;
  total_videos: number;
  videos_downloaded: number;
  videos_transcribed: number;
  total_chunks: number;
  chunks_embedded: number;
}

export interface PipelineTaskResponse {
  id: string;
  task_type: string;
  status: TaskStatus;
  progress: number;
  error_message?: string | null;
  result?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface TaskRequest {
  task_type: TaskType;
  question_to_embed?: string | null;
  channel_url?: string | null;
  max_videos?: number;
  download?: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  taskId?: string;
  taskType?: string;
}

export interface SSETaskUpdate {
  type: 'task_update';
  task: {
    id: string;
    task_type: string;
    status: string;
    progress: number;
    error_message?: string | null;
    result?: string | null;
    completed_at?: string | null;
  };
}

// Settings Types
export type SettingComponent = 'BACKEND' | 'WORKER';

export type SettingValueType = 'int' | 'float' | 'string' | 'bool';

export interface SettingResponse {
  id: number;
  component: SettingComponent;
  section: string;
  key: string;
  value: string;
  value_type: SettingValueType;
  description: string | null;
  updated_at: string;
}

export interface SettingCreate {
  component: SettingComponent;
  section: string;
  key: string;
  value: string;
  value_type?: SettingValueType;
  description?: string;
}

export interface SettingUpdate {
  value?: string | number | boolean;
  value_type?: SettingValueType;
  description?: string;
}

// Settings map returned by get_settings - flat key:value structure
export type SettingsMap = Record<string, string | number | boolean>;
