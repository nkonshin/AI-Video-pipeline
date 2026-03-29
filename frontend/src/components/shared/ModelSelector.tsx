import { useState } from 'react';
import { Check, X, Loader, Plus } from 'lucide-react';
import { api } from '../../lib/api';

export interface ModelOption {
  id: string;
  label: string;
  price?: number;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: ModelOption[];
  priceUnit?: string;
}

export function ModelSelector({ label, value, onChange, presets, priceUnit }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean; name?: string; description?: string; error?: string;
  } | null>(null);

  const isCustom = value !== '' && !presets.some((m) => m.id === value);

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
            {m.price != null && priceUnit && (
              <span className="ml-1 text-gray-500">${m.price}/{priceUnit}</span>
            )}
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
              disabled={validating || !customInput.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[12px] text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-40"
            >
              {validating ? <Loader className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Verify
            </button>
          </div>

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
