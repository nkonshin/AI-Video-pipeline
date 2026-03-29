import { Plus, Trash2 } from 'lucide-react';
import { useT } from '../../lib/i18n';

export interface Scene {
  scene_id: string;
  description: string;
  image_prompt: string;
  video_prompt: string;
  voiceover_text: string;
}

interface SceneEditorProps {
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
}

function makeId() {
  return crypto.randomUUID?.() ?? String(Date.now());
}

export default function SceneEditor({ scenes, onChange }: SceneEditorProps) {
  const t = useT();
  const updateScene = (index: number, patch: Partial<Scene>) => {
    const next = scenes.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const addScene = () => {
    onChange([
      ...scenes,
      {
        scene_id: makeId(),
        description: '',
        image_prompt: '',
        video_prompt: '',
        voiceover_text: '',
      },
    ]);
  };

  const removeScene = (index: number) => {
    onChange(scenes.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-400">
          {t('create.scenes')} ({scenes.length})
        </h2>
        <button
          type="button"
          onClick={addScene}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('create.addScene')}
        </button>
      </div>

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div
            key={scene.scene_id}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scene {i + 1}
              </span>
              {scenes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeScene(i)}
                  className="text-gray-600 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('create.sceneName')}
                </label>
                <input
                  type="text"
                  value={scene.description}
                  onChange={(e) =>
                    updateScene(i, { description: e.target.value })
                  }
                  placeholder="e.g. Opening shot"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('create.imagePrompt')}
                </label>
                <textarea
                  value={scene.image_prompt}
                  onChange={(e) =>
                    updateScene(i, { image_prompt: e.target.value })
                  }
                  placeholder={t('create.describeImage')}
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('create.videoPrompt')}
                </label>
                <textarea
                  value={scene.video_prompt}
                  onChange={(e) =>
                    updateScene(i, { video_prompt: e.target.value })
                  }
                  placeholder={t('create.describeMotion')}
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('create.voiceoverText')}
                </label>
                <textarea
                  value={scene.voiceover_text}
                  onChange={(e) =>
                    updateScene(i, { voiceover_text: e.target.value })
                  }
                  placeholder={t('create.narratorSays')}
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] border-dashed rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">
            No scenes yet. Select a content type above to auto-generate, or add
            scenes manually.
          </p>
        </div>
      )}
    </div>
  );
}
