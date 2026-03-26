import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  Save,
  Key,
  Cpu,
  DollarSign,
  FolderOpen,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Settings, Budget } from '../lib/types';
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  VOICES,
} from '../components/create/AdvancedSettings';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const { data: budget } = useQuery<Budget>({
    queryKey: ['budget'],
    queryFn: () => api.getBudget(),
  });

  // Local form state
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [imageModel, setImageModel] = useState('');
  const [videoModel, setVideoModel] = useState('');
  const [ttsVoice, setTtsVoice] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [saved, setSaved] = useState(false);

  // Sync remote settings to local state
  useEffect(() => {
    if (settings) {
      setApiToken(settings.replicate_api_token);
      setImageModel(settings.default_image_model);
      setVideoModel(settings.default_video_model);
      setTtsVoice(settings.default_tts_voice);
      setBudgetLimit(String(settings.budget_limit));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Settings>) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      replicate_api_token: apiToken,
      default_image_model: imageModel,
      default_video_model: videoModel,
      default_tts_voice: ttsVoice,
      budget_limit: parseFloat(budgetLimit) || 0,
    });
  };

  const budgetSpent = budget?.spent ?? settings?.budget_spent ?? 0;
  const budgetLimitNum = parseFloat(budgetLimit) || 0;
  const budgetRemaining = Math.max(0, budgetLimitNum - budgetSpent);
  const budgetPercent =
    budgetLimitNum > 0
      ? Math.min(100, (budgetSpent / budgetLimitNum) * 100)
      : 0;

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Global configuration</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Settings saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-300">API Keys</h2>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Replicate API Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="r8_..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 pr-10 focus:outline-none focus:border-indigo-500/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Default Models */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-300">
              Default Models
            </h2>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Image Model
            </label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Video Model
            </label>
            <select
              value={videoModel}
              onChange={(e) => setVideoModel(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
            >
              {VIDEO_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              TTS Voice
            </label>
            <select
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition appearance-none"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-300">Budget</h2>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Monthly Limit ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
            />
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">
                Spent: ${budgetSpent.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">
                Remaining: ${budgetRemaining.toFixed(2)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPercent > 90
                    ? 'bg-red-500'
                    : budgetPercent > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            {budgetLimitNum > 0 && (
              <p className="text-[11px] text-gray-600 mt-1">
                {budgetPercent.toFixed(0)}% used
              </p>
            )}
          </div>
        </div>

        {/* Output Directory */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-300">Output</h2>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Output Directory
            </label>
            <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-500 font-mono">
              {settings?.output_dir || 'Not configured'}
            </div>
            <p className="text-[11px] text-gray-600 mt-1">
              Configured on the backend. Generated videos are saved here.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {saveMutation.isError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          Failed to save: {(saveMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}
