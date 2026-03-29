import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ModelSelector } from '../shared/ModelSelector';
import { ModelParams } from '../shared/ModelParams';
import { useT } from '../../lib/i18n';

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

export const TTS_MODELS = [
  { id: 'minimax/speech-02-hd', label: 'MiniMax Speech HD', price: 0.05 },
  { id: 'minimax/speech-02-turbo', label: 'MiniMax Speech Turbo', price: 0.03 },
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
  ttsEngine: string;
  ttsVoice: string;
  ttsModel: string;
  ttsParams: Record<string, any>;
  imageParams: Record<string, any>;
  videoParams: Record<string, any>;
  onImageModelChange: (v: string) => void;
  onVideoModelChange: (v: string) => void;
  onTtsEngineChange: (v: string) => void;
  onTtsVoiceChange: (v: string) => void;
  onTtsModelChange: (v: string) => void;
  onTtsParamsChange: (v: Record<string, any>) => void;
  onImageParamsChange: (v: Record<string, any>) => void;
  onVideoParamsChange: (v: Record<string, any>) => void;
}

export default function AdvancedSettings({
  imageModel,
  videoModel,
  ttsEngine,
  ttsVoice,
  ttsModel,
  ttsParams,
  imageParams,
  videoParams,
  onImageModelChange,
  onVideoModelChange,
  onTtsEngineChange,
  onTtsVoiceChange,
  onTtsModelChange,
  onTtsParamsChange,
  onImageParamsChange,
  onVideoParamsChange,
}: AdvancedSettingsProps) {
  const t = useT();
  const imgLabel = IMAGE_MODELS.find((m) => m.id === imageModel)?.label ?? imageModel;
  const vidLabel = VIDEO_MODELS.find((m) => m.id === videoModel)?.label ?? videoModel;
  const ttsSummary = ttsEngine === 'edge-tts'
    ? `Edge TTS — ${ttsVoice.replace('ru-RU-', '')}`
    : `Replicate — ${TTS_MODELS.find(m => m.id === ttsModel)?.label ?? ttsModel}`;

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">{t('settings.advancedSettings')}</h2>
      <div className="space-y-2">
        <Accordion title={t('settings.modelSettings')} summary={`${imgLabel} + ${vidLabel}`} defaultOpen>
          <ModelSelector
            label={t('settings.imageModel')}
            value={imageModel}
            onChange={(v) => { onImageModelChange(v); onImageParamsChange({}); }}
            presets={IMAGE_MODELS}
            priceUnit="img"
          />
          <ModelParams modelId={imageModel} values={imageParams} onChange={onImageParamsChange} />

          <ModelSelector
            label={t('settings.videoModel')}
            value={videoModel}
            onChange={(v) => { onVideoModelChange(v); onVideoParamsChange({}); }}
            presets={VIDEO_MODELS}
            priceUnit="clip"
          />
          <ModelParams modelId={videoModel} values={videoParams} onChange={onVideoParamsChange} />
        </Accordion>

        <Accordion title={t('settings.voiceTts')} summary={ttsSummary}>
          {/* Engine selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">TTS Engine</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onTtsEngineChange('edge-tts')}
                className={`px-3 py-1.5 rounded-lg text-[12px] transition ${
                  ttsEngine === 'edge-tts'
                    ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                }`}
              >
                Edge TTS (free)
              </button>
              <button
                type="button"
                onClick={() => onTtsEngineChange('replicate')}
                className={`px-3 py-1.5 rounded-lg text-[12px] transition ${
                  ttsEngine === 'replicate'
                    ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                }`}
              >
                Replicate (paid)
              </button>
            </div>
          </div>

          {/* Edge TTS voice selector */}
          {ttsEngine === 'edge-tts' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('settings.voice')}</label>
              <select
                value={ttsVoice}
                onChange={(e) => onTtsVoiceChange(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
              >
                {VOICES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-600 mt-1">Microsoft Neural Voices (free, no API key needed)</p>
            </div>
          )}

          {/* Replicate TTS model selector */}
          {ttsEngine === 'replicate' && (
            <>
              <ModelSelector
                label="TTS Model"
                value={ttsModel}
                onChange={(v) => { onTtsModelChange(v); onTtsParamsChange({}); }}
                presets={TTS_MODELS}
                priceUnit="req"
              />
              <ModelParams modelId={ttsModel} values={ttsParams} onChange={onTtsParamsChange} />
            </>
          )}
        </Accordion>

        <Accordion title={t('settings.subtitles')} summary={t('settings.autoGenerated')}>
          <p className="text-xs text-gray-500">
            {t('settings.subtitlesDesc')}
          </p>
        </Accordion>
      </div>
    </div>
  );
}
