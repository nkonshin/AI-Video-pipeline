import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, Loader, Plus } from 'lucide-react';
import { api } from '../../lib/api';

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

/* ── model selector with custom input ── */

interface ModelOption {
  id: string;
  label: string;
  price?: number;
}

function ModelSelector({
  label,
  value,
  onChange,
  presets,
  priceUnit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: ModelOption[];
  priceUnit: string;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; name?: string; description?: string; error?: string } | null>(null);

  const isCustom = !presets.some((m) => m.id === value);

  const handleValidate = async () => {
    const modelId = customInput.trim();
    if (!modelId) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await api.validateModel(modelId);
      setValidationResult(result);
      if (result.valid) {
        onChange(modelId);
      }
    } catch {
      setValidationResult({ valid: false, error: 'Network error' });
    } finally {
      setValidating(false);
    }
  };

  const handlePresetSelect = (id: string) => {
    onChange(id);
    setCustomMode(false);
    setValidationResult(null);
    setCustomInput('');
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handlePresetSelect(m.id)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
              value === m.id
                ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
            }`}
          >
            {m.label}
            {m.price != null && <span className="ml-1 text-gray-500">${m.price}/{priceUnit}</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomMode(true); setValidationResult(null); }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
            customMode || isCustom
              ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
              : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
          }`}
        >
          <Plus className="h-3 w-3" />
          Custom
        </button>
      </div>

      {/* Custom input */}
      {(customMode || isCustom) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput || (isCustom && !customMode ? value : '')}
              onChange={(e) => { setCustomInput(e.target.value); setValidationResult(null); }}
              placeholder="owner/model-name"
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-gray-300 outline-none focus:border-indigo-500/30 transition"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || !(customInput.trim())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[12px] text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-40"
            >
              {validating ? <Loader className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Verify
            </button>
          </div>

          {/* Validation result */}
          {validationResult && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] ${
              validationResult.valid
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}>
              {validationResult.valid ? (
                <>
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">{validationResult.name}</div>
                    {validationResult.description && (
                      <div className="text-[11px] text-gray-400 mt-0.5">{validationResult.description}</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{validationResult.error}</span>
                </>
              )}
            </div>
          )}

          {/* Currently selected custom model */}
          {isCustom && !customMode && (
            <div className="text-[11px] text-gray-500">
              Currently using: <span className="text-gray-300 font-mono">{value}</span>
            </div>
          )}
        </div>
      )}
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
        {/* Model Settings */}
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

        {/* Voice & TTS */}
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

        {/* Subtitles */}
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
