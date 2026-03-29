import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings2, Loader, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { api } from '../../lib/api';
import type { ModelParam } from '../../lib/types';

// Recommended defaults for video pipeline use case
const RECOMMENDED: Record<string, Record<string, any>> = {
  // Image models — vertical 9:16 for Shorts/Reels
  'black-forest-labs/flux-2-max': { width: 1080, height: 1920, aspect_ratio: '9:16', output_format: 'png', output_quality: 95, safety_tolerance: 5 },
  'black-forest-labs/flux-1.1-pro': { width: 1080, height: 1920, aspect_ratio: '9:16', output_format: 'png', output_quality: 95 },
  'black-forest-labs/flux-dev': { width: 1080, height: 1920, aspect_ratio: '9:16', output_format: 'png' },
  'black-forest-labs/flux-schnell': { width: 1080, height: 1920, aspect_ratio: '9:16', output_format: 'png' },
  'stability-ai/sdxl': { width: 1080, height: 1920 },
  // Video models — vertical, max quality
  'minimax/hailuo-2.3': { duration: 5 },
  'minimax/hailuo-2.3-fast': { duration: 5 },
  'xai/grok-imagine-video': { duration: 5, resolution: '720p', aspect_ratio: '9:16' },
  'kwaivgi/kling-v2.5-turbo-pro': { duration: 5, aspect_ratio: '9:16' },
  'wan-video/wan-2.2-i2v-fast': {},
};

interface Props {
  modelId: string;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

/* ── Tooltip ── */

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  if (!text) return null;

  return (
    <span className="relative inline-flex ml-1">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help text-gray-600 hover:text-gray-400 transition"
      >
        <Info className="h-3 w-3" />
      </span>
      {show && (
        <span className="fixed z-[9999] px-3 py-2 rounded-lg bg-gray-900 border border-white/[0.15] text-[11px] text-gray-300 leading-relaxed max-w-[280px] shadow-xl whitespace-normal"
          style={{
            position: 'fixed',
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
            pointerEvents: 'none',
          }}
          ref={(el) => {
            if (el) {
              const trigger = el.previousElementSibling as HTMLElement;
              if (trigger) {
                const rect = trigger.getBoundingClientRect();
                el.style.left = `${rect.left + rect.width / 2}px`;
                el.style.top = `${rect.top - 8}px`;
              }
            }
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/* ── Field Label ── */

function FieldLabel({ title, description, range }: { title: string; description: string; range?: string }) {
  return (
    <label className="flex items-center gap-0.5 text-[11px] text-gray-500 mb-1">
      {title}
      {range && <span className="text-gray-600 ml-0.5">({range})</span>}
      <Tooltip text={description} />
    </label>
  );
}

/* ── Param Field ── */

function ParamField({ param, value, onChange }: { param: ModelParam; value: any; onChange: (v: any) => void }) {
  const displayValue = value ?? param.default ?? '';

  if (param.type === 'enum' && param.options) {
    return (
      <div>
        <FieldLabel title={param.title} description={param.description} />
        <select
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-300 outline-none focus:border-indigo-500/30 transition appearance-none"
        >
          {param.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === 'integer' || param.type === 'number') {
    const range = param.min != null && param.max != null ? `${param.min}-${param.max}` : undefined;
    return (
      <div>
        <FieldLabel title={param.title} description={param.description} range={range} />
        <input
          type="number"
          value={displayValue}
          onChange={(e) => onChange(param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={param.min}
          max={param.max}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-300 outline-none focus:border-indigo-500/30 transition"
        />
      </div>
    );
  }

  if (param.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={displayValue === true || displayValue === 'true'}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-white/[0.06] bg-white/[0.03] text-indigo-500 focus:ring-indigo-500/30"
        />
        <span className="flex items-center gap-0.5 text-[12px] text-gray-400">
          {param.title}
          <Tooltip text={param.description} />
        </span>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel title={param.title} description={param.description} />
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-300 outline-none focus:border-indigo-500/30 transition"
      />
    </div>
  );
}

/* ── Main Component ── */

export function ModelParams({ modelId, values, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['model-schema', modelId],
    queryFn: () => api.getModelSchema(modelId),
    enabled: !!modelId && modelId.includes('/'),
    staleTime: 5 * 60 * 1000,
  });

  // Apply recommended defaults when schema loads
  useEffect(() => {
    if (data?.params && Object.keys(values).length === 0) {
      // Start with API defaults
      const defaults: Record<string, any> = {};
      for (const p of data.params) {
        if (p.default != null) {
          defaults[p.name] = p.default;
        }
      }
      // Override with our recommended values for video pipeline
      const recommended = RECOMMENDED[modelId];
      if (recommended) {
        Object.assign(defaults, recommended);
      }
      if (Object.keys(defaults).length > 0) {
        onChange(defaults);
      }
    }
  }, [data]);

  if (!modelId || !modelId.includes('/')) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mt-2">
        <Loader className="h-3 w-3 animate-spin" />
        Loading model parameters...
      </div>
    );
  }
  if (!data?.params || data.params.length === 0) return null;

  const params = data.params;
  const changedCount = Object.keys(values).filter(k => {
    const param = params.find(p => p.name === k);
    return param && values[k] !== param.default;
  }).length;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-300 transition"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Settings2 className="h-3 w-3" />
        Model Parameters
        {changedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px]">
            {changedCount} customized
          </span>
        )}
        <span className="text-gray-600">({params.length} available)</span>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
          {params.map((param) => (
            <ParamField
              key={param.name}
              param={param}
              value={values[param.name]}
              onChange={(v) => onChange({ ...values, [param.name]: v })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
