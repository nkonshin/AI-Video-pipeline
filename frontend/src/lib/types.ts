export interface Video {
  id: string;
  title: string;
  content_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scenario_config: Record<string, any>;
  cost: number;
  output_path: string | null;
  thumbnail_path: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  publications: Publication[];
}

export interface VideoList {
  videos: Video[];
  total: number;
}

export interface VideoCreate {
  title: string;
  content_type: string;
  scenario_config: Record<string, any>;
  skip_publish?: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  content_type: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ScenarioCreate {
  name: string;
  content_type: string;
  config: Record<string, any>;
}

export interface ScenarioGenerate {
  content_type: string;
  episode_number?: number;
  character_name?: string;
  context_index?: number;
  business_type?: string;
  company_name?: string;
}

export interface Publication {
  id: string;
  platform: string;
  status: string;
  post_url: string | null;
  error_message: string | null;
  published_at: string;
}

export interface PlatformConfig {
  enabled: boolean;
  caption_template: string;
  hashtags: string[];
  credentials: Record<string, string>;
}

export interface PlatformStatus {
  name: string;
  connected: boolean;
  config: PlatformConfig;
}

export interface Settings {
  replicate_api_token: string;
  default_image_model: string;
  default_video_model: string;
  default_tts_engine: string;
  default_tts_voice: string;
  budget_limit: number;
  budget_spent: number;
  output_dir: string;
}

export interface Budget {
  limit: number;
  spent: number;
  remaining: number;
}

export interface PipelineProgress {
  job_id: string;
  stage: string;
  stage_label: string;
  scene: number;
  total_scenes: number;
  percent: number;
  message: string;
  cost_so_far: number;
}

export interface ModelParam {
  name: string;
  title: string;
  description: string;
  type: string;
  default?: any;
  options?: string[];
  min?: number;
  max?: number;
}

export interface PublishLogEntry {
  id: string;
  video_id: string;
  video_title: string;
  platform: string;
  status: string;
  post_url: string | null;
  published_at: string;
}
