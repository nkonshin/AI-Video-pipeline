import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ModelSelector } from '../shared/ModelSelector';

/* ── preset models ── */

export const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux-1.1-pro', label: 'FLUX 1.1 Pro', price: 0.04 },
  { id: 'black-forest-labs/flux-dev', label: 'FLUX Dev', price: 0.025 },
  { id: 'black-forest-labs/flux-schnell', label: 'FLUX Schnell', price: 0.003 },
  { id: 'stability-ai/sdxl', label: 'SDXL', price: 0.01 },
];

export const VIDEO_MODELS = [
  { id: 'minimax/hailuo-2.3', label: 'Hailuo 2.3', price: 0.30 },
  { id: 'minimax/hailuo-2.3-fast', label: 'Hailuo Fast', price: 0.12 },
  { id: 'kwaivgi/kling-v2.5-turbo-pro', label: 'Kling v2.5', price: 0.50 },
  { id: 'wan-video/wan-2.2-i2v-fast', label: 'Wan Fast', price: 0.09 },
];

export const VOICES = [
  'ru-RU-DmitryNeural',
  'ru-RU-SvetlanaNeural',
  'ru-RU-DariyaNeural',
];

/* ── accordion ── */

function Accordion({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        {!open && summary && <span className="text-xs text-gray-500 truncate ml-4">{summary}</span>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>}
    </div>
  );
}

/* ── main component ── */

interface AdvancedSettingsProps {
  imageModel: string;
  videoModel: string;
  ttsVoice: string;
  onImageModelChange: (v: string) => void;
  onVideoModelChange: (v: string) => void;
  onTtsVoiceChange: (v: string) => void;
}

export default function AdvancedSettings({
  imageModel,
  videoModel,
  ttsVoice,
  onImageModelChange,
  onVideoModelChange,
  onTtsVoiceChange,
}: AdvancedSettingsProps) {
  const imgLabel = IMAGE_MODELS.find((m) => m.id === imageModel)?.label ?? imageModel;
  const vidLabel = VIDEO_MODELS.find((m) => m.id === videoModel)?.label ?? videoModel;

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">Advanced Settings</h2>
      <div className="space-y-2">
        <Accordion title="Model Settings" summary={`${imgLabel} + ${vidLabel}`} defaultOpen>
          <ModelSelector
            label="Image Model"
            value={imageModel}
            onChange={onImageModelChange}
            presets={IMAGE_MODELS}
            priceUnit="img"
          />
          <ModelSelector
            label="Video Model"
            value={videoModel}
            onChange={onVideoModelChange}
            presets={VIDEO_MODELS}
            priceUnit="clip"
          />
        </Accordion>

        <Accordion title="Voice & TTS" summary={ttsVoice}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Voice</label>
            <select
              value={ttsVoice}
              onChange={(e) => onTtsVoiceChange(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </Accordion>

        <Accordion title="Subtitles" summary="Auto-generated">
          <p className="text-xs text-gray-500">
            Subtitles are automatically generated from voiceover text and burned
            into the final video.
          </p>
        </Accordion>
      </div>
    </div>
  );
}
