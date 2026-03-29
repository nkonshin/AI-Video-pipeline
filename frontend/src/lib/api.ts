import type {
  VideoList,
  Video,
  VideoCreate,
  Scenario,
  ScenarioCreate,
  ScenarioGenerate,
  PlatformStatus,
  PlatformConfig,
  PublishLogEntry,
  Settings,
  Budget,
  ModelParam,
} from './types';

const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Videos
  getVideos: (params?: { status?: string; content_type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.content_type) sp.set('content_type', params.content_type);
    const qs = sp.toString();
    return request<VideoList>(`/api/videos${qs ? '?' + qs : ''}`);
  },
  getVideo: (id: string) => request<Video>(`/api/videos/${id}`),
  createVideo: (data: VideoCreate) =>
    request<Video>('/api/videos', { method: 'POST', body: JSON.stringify(data) }),
  deleteVideo: (id: string) => request<void>(`/api/videos/${id}`, { method: 'DELETE' }),
  startGeneration: (id: string) =>
    request<{ id: string; status: string }>(`/api/videos/${id}/generate`, { method: 'POST' }),
  retryGeneration: (id: string, opts: { skip_images?: boolean; skip_video?: boolean } = {}) =>
    request<{ id: string; status: string }>(`/api/videos/${id}/retry`, {
      method: 'POST', body: JSON.stringify(opts),
    }),
  publishVideo: (id: string, platforms: string[]) =>
    request<Record<string, unknown>>(`/api/videos/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ platforms }),
    }),

  // Scenarios
  getScenarios: () => request<Scenario[]>('/api/scenarios'),
  getScenario: (id: string) => request<Scenario>(`/api/scenarios/${id}`),
  createScenario: (data: ScenarioCreate) =>
    request<Scenario>('/api/scenarios', { method: 'POST', body: JSON.stringify(data) }),
  updateScenario: (id: string, data: Partial<ScenarioCreate>) =>
    request<Scenario>(`/api/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScenario: (id: string) => request<void>(`/api/scenarios/${id}`, { method: 'DELETE' }),
  generateScenario: (data: ScenarioGenerate) =>
    request<Scenario>('/api/scenarios/generate', { method: 'POST', body: JSON.stringify(data) }),

  // Publishing
  getPlatforms: () => request<PlatformStatus[]>('/api/publishing/platforms'),
  updatePlatform: (name: string, config: PlatformConfig) =>
    request<PlatformStatus>(`/api/publishing/platforms/${name}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  getPublishLog: () => request<PublishLogEntry[]>('/api/publishing/log'),

  // Settings
  getSettings: () => request<Settings>('/api/settings'),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getBudget: () => request<Budget>('/api/settings/budget'),
  validateModel: (model_id: string) =>
    request<{ valid: boolean; model_id?: string; name?: string; owner?: string; description?: string; error?: string }>(
      '/api/settings/validate-model', { method: 'POST', body: JSON.stringify({ model_id }) }
    ),
  getModelSchema: (model_id: string) =>
    request<{ model_id?: string; params?: ModelParam[]; error?: string }>(
      '/api/settings/model-schema', { method: 'POST', body: JSON.stringify({ model_id }) }
    ),
};
