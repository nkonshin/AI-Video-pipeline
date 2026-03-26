import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Budget } from '../lib/types';
import ContentTypeSelector from '../components/create/ContentTypeSelector';
import SceneEditor from '../components/create/SceneEditor';
import type { Scene } from '../components/create/SceneEditor';
import AdvancedSettings, {
  IMAGE_MODELS,
  VIDEO_MODELS,
  VOICES,
} from '../components/create/AdvancedSettings';
import CostEstimate from '../components/create/CostEstimate';

export default function CreateVideoPage() {
  const navigate = useNavigate();

  const [contentType, setContentType] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].id as string);
  const [videoModel, setVideoModel] = useState(VIDEO_MODELS[0].id as string);
  const [ttsVoice, setTtsVoice] = useState<string>(VOICES[0]);
  const [generating, setGenerating] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(false);

  const { data: budget } = useQuery<Budget>({
    queryKey: ['budget'],
    queryFn: () => api.getBudget(),
  });

  const handleSelectType = async (id: string) => {
    setContentType(id);

    if (id === 'custom') {
      setScenes([
        {
          scene_id: crypto.randomUUID?.() ?? String(Date.now()),
          description: '',
          image_prompt: '',
          voiceover_text: '',
        },
      ]);
      return;
    }

    // Auto-generate scenario from API
    setLoadingScenario(true);
    try {
      const scenario = await api.generateScenario({ content_type: id });
      const config = scenario.config as {
        scenes?: Array<{
          scene_id?: string;
          description?: string;
          image_prompt?: string;
          voiceover_text?: string;
        }>;
      };
      if (config.scenes && Array.isArray(config.scenes)) {
        setScenes(
          config.scenes.map((s, i) => ({
            scene_id:
              s.scene_id ?? crypto.randomUUID?.() ?? String(Date.now() + i),
            description: s.description ?? '',
            image_prompt: s.image_prompt ?? '',
            voiceover_text: s.voiceover_text ?? '',
          })),
        );
      }
    } catch {
      // If API fails, give the user an empty scene to work with
      setScenes([
        {
          scene_id: crypto.randomUUID?.() ?? String(Date.now()),
          description: '',
          image_prompt: '',
          voiceover_text: '',
        },
      ]);
    } finally {
      setLoadingScenario(false);
    }
  };

  const handleGenerate = async () => {
    if (scenes.length === 0 || !contentType) return;
    setGenerating(true);
    try {
      const video = await api.createVideo({
        title: `${contentType} - ${new Date().toLocaleDateString()}`,
        content_type: contentType,
        scenario_config: {
          scenes,
          image_model: imageModel,
          video_model: videoModel,
          tts_voice: ttsVoice,
        },
      });
      await api.startGeneration(video.id);
      navigate('/');
    } catch {
      // Error is shown via global handler or could add toast here
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-200">Create Video</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure and launch a new generation
        </p>
      </div>

      {/* Content type */}
      <ContentTypeSelector selected={contentType} onSelect={handleSelectType} />

      {/* Loading indicator for scenario generation */}
      {loadingScenario && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Generating scenario...
        </div>
      )}

      {/* Scene editor */}
      <SceneEditor scenes={scenes} onChange={setScenes} />

      {/* Advanced settings + cost estimate in 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdvancedSettings
            imageModel={imageModel}
            videoModel={videoModel}
            ttsVoice={ttsVoice}
            onImageModelChange={setImageModel}
            onVideoModelChange={setVideoModel}
            onTtsVoiceChange={setTtsVoice}
          />
        </div>
        <div>
          <CostEstimate
            sceneCount={scenes.length}
            imageModel={imageModel}
            videoModel={videoModel}
            budgetRemaining={budget?.remaining ?? null}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </div>
      </div>
    </div>
  );
}
