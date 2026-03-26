import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Trash2,
  Play,
  ChevronDown,
  Code,
  Sparkles,
  Loader,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Scenario } from '../lib/types';

const CONTENT_TYPES = [
  { id: 'fruit-soap', label: 'Fruit Soap', emoji: '\u{1F353}' },
  { id: 'character-remix', label: 'Character Remix', emoji: '\u{1F3AD}' },
  { id: 'mascot', label: 'Business Mascot', emoji: '\u{1F3E2}' },
];

function ContentTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-gray-400 uppercase tracking-wider">
      {type}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSceneCount(config: Record<string, any>): number {
  if (config?.scenes && Array.isArray(config.scenes)) {
    return config.scenes.length;
  }
  return 0;
}

export default function ScenariosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedYaml, setExpandedYaml] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: scenarios, isLoading } = useQuery<Scenario[]>({
    queryKey: ['scenarios'],
    queryFn: () => api.getScenarios(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (contentType: string) =>
      api.generateScenario({ content_type: contentType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setDropdownOpen(false);
    },
  });

  const sorted = (scenarios ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Scenarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage reusable scenario templates
          </p>
        </div>

        {/* Generate from Template dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate from Template
            <ChevronDown className="h-3 w-3" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-xl z-20 overflow-hidden">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => generateMutation.mutate(ct.id)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.04] transition flex items-center gap-2"
                  >
                    <span>{ct.emoji}</span>
                    {ct.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No scenarios yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Generate a scenario from a template to get started
          </p>
        </div>
      )}

      {/* Scenario list */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((scenario) => {
            const sceneCount = getSceneCount(scenario.config);
            const isExpanded = expandedYaml === scenario.id;

            return (
              <div
                key={scenario.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
              >
                {/* Row */}
                <div className="flex items-center gap-4 p-5">
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {scenario.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <ContentTypeBadge type={scenario.content_type} />
                      <span className="text-xs text-gray-500">
                        {sceneCount} scene{sceneCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatDate(scenario.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedYaml(isExpanded ? null : scenario.id)
                      }
                      className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition"
                      title="View config"
                    >
                      <Code className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/create')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-sm text-gray-300 hover:bg-white/[0.08] transition"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(scenario.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition"
                      title="Delete scenario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* YAML view */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-black/20 p-4">
                    <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(scenario.config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
