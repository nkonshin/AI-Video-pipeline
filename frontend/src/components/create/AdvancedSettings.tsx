import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ── price tables ── */

export const IMAGE_MODELS = [
  { id: 'flux-pro', label: 'FLUX Pro', price: 0.04 },
  { id: 'flux-dev', label: 'FLUX Dev', price: 0.025 },
  { id: 'flux-schnell', label: 'FLUX Schnell', price: 0.003 },
  { id: 'sdxl', label: 'SDXL', price: 0.01 },
] as const;

export const VIDEO_MODELS = [
  { id: 'hailuo-2.3', label: 'Hailuo 2.3', price: 0.3 },
  { id: 'hailuo-fast', label: 'Hailuo Fast', price: 0.12 },
  { id: 'kling-v2.5', label: 'Kling v2.5', price: 0.5 },
  { id: 'wan-fast', label: 'Wan Fast', price: 0.09 },
] as const;

export const VOICES = [
  'DmitryNeural',
  'SvetlanaNeural',
  'DariyaNeural',
] as const;

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
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        {!open && summary && (
          <span className="text-xs text-gray-500 truncate ml-4">
            {summary}
          </span>
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>}
    </div>
  );
}

/* ── select helper ── */

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
      >
        {children}
      </select>
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
  const imgLabel =
    IMAGE_MODELS.find((m) => m.id === imageModel)?.label ?? imageModel;
  const vidLabel =
    VIDEO_MODELS.find((m) => m.id === videoModel)?.label ?? videoModel;

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">
        Advanced Settings
      </h2>
      <div className="space-y-2">
        {/* Model Settings */}
        <Accordion
          title="Model Settings"
          summary={`${imgLabel} + ${vidLabel}`}
          defaultOpen
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Image Model"
              value={imageModel}
              onChange={onImageModelChange}
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} (${m.price.toFixed(3)}/img)
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Video Model"
              value={videoModel}
              onChange={onVideoModelChange}
            >
              {VIDEO_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} (${m.price.toFixed(2)}/clip)
                </option>
              ))}
            </SelectField>
          </div>
        </Accordion>

        {/* Voice & TTS */}
        <Accordion title="Voice & TTS" summary={ttsVoice}>
          <SelectField
            label="Voice"
            value={ttsVoice}
            onChange={onTtsVoiceChange}
          >
            {VOICES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </SelectField>
        </Accordion>

        {/* Subtitles */}
        <Accordion title="Subtitles" summary="Auto-generated">
          <p className="text-xs text-gray-500">
            Subtitles are automatically generated from voiceover text and burned
            into the final video. Style and positioning can be customized in
            global settings.
          </p>
        </Accordion>
      </div>
    </div>
  );
}
