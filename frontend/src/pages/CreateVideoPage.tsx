import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Budget, Settings } from '../lib/types';
import ContentTypeSelector from '../components/create/ContentTypeSelector';
import SceneEditor from '../components/create/SceneEditor';
import type { Scene } from '../components/create/SceneEditor';
import AdvancedSettings from '../components/create/AdvancedSettings';
import CostEstimate from '../components/create/CostEstimate';

export default function CreateVideoPage() {
  const navigate = useNavigate();

  const [contentType, setContentType] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [imageModel, setImageModel] = useState('');
  const [videoModel, setVideoModel] = useState('');
  const [ttsVoice, setTtsVoice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(false);

  const { data: budget } = useQuery<Budget>({
    queryKey: ['budget'],
    queryFn: () => api.getBudget(),
  });

  // Load default models from Settings API
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  // Apply saved defaults once loaded (only on first load)
  useEffect(() => {
    if (settings && !imageModel) {
      setImageModel(settings.default_image_model);
      setVideoModel(settings.default_video_model);
      setTtsVoice(settings.default_tts_voice);
    }
  }, [settings]);

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
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-200">Create Video</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure and launch a new generation
        </p>
      </div>

      <ContentTypeSelector selected={contentType} onSelect={handleSelectType} />

      {loadingScenario && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Generating scenario...
        </div>
      )}

      <SceneEditor scenes={scenes} onChange={setScenes} />

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
