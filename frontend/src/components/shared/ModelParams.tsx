import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings2, Loader, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { ModelParam } from '../../lib/types';

interface Props {
  modelId: string;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

function ParamField({ param, value, onChange }: { param: ModelParam; value: any; onChange: (v: any) => void }) {
  const displayValue = value ?? param.default ?? '';

  if (param.type === 'enum' && param.options) {
    return (
      <div>
        <label className="block text-[11px] text-gray-500 mb-1" title={param.description}>
          {param.title}
        </label>
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
    return (
      <div>
        <label className="block text-[11px] text-gray-500 mb-1" title={param.description}>
          {param.title}
          {param.min != null && param.max != null && (
            <span className="text-gray-600 ml-1">({param.min}-{param.max})</span>
          )}
        </label>
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
        <label className="text-[12px] text-gray-400" title={param.description}>
          {param.title}
        </label>
      </div>
    );
  }

  // String fallback
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1" title={param.description}>
        {param.title}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-300 outline-none focus:border-indigo-500/30 transition"
      />
    </div>
  );
}

export function ModelParams({ modelId, values, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['model-schema', modelId],
    queryFn: () => api.getModelSchema(modelId),
    enabled: !!modelId && modelId.includes('/'),
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });

  // Set defaults when schema loads
  useEffect(() => {
    if (data?.params && Object.keys(values).length === 0) {
      const defaults: Record<string, any> = {};
      for (const p of data.params) {
        if (p.default != null) {
          defaults[p.name] = p.default;
        }
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
            {changedCount} changed
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
