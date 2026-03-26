import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Send,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api } from '../lib/api';
import type { PlatformStatus, PublishLogEntry } from '../lib/types';

const PLATFORM_META: Record<string, { emoji: string; color: string }> = {
  telegram: { emoji: 'T', color: 'from-sky-500 to-blue-600' },
  instagram: { emoji: 'I', color: 'from-pink-500 to-purple-600' },
  youtube: { emoji: 'Y', color: 'from-red-500 to-red-700' },
  vk: { emoji: 'V', color: 'from-blue-500 to-blue-700' },
  tiktok: { emoji: 'K', color: 'from-gray-700 to-gray-900' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    published: {
      icon: <CheckCircle className="h-3 w-3" />,
      cls: 'bg-emerald-500/20 text-emerald-300',
    },
    failed: {
      icon: <AlertCircle className="h-3 w-3" />,
      cls: 'bg-red-500/20 text-red-300',
    },
    pending: {
      icon: <Clock className="h-3 w-3" />,
      cls: 'bg-gray-500/20 text-gray-300',
    },
  };

  const c = map[status] ?? map['pending'];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.cls}`}
    >
      {c.icon}
      {status}
    </span>
  );
}

export default function PublishingPage() {
  const queryClient = useQueryClient();

  const { data: platforms, isLoading: loadingPlatforms } = useQuery<
    PlatformStatus[]
  >({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatforms(),
  });

  const { data: log, isLoading: loadingLog } = useQuery<PublishLogEntry[]>({
    queryKey: ['publish-log'],
    queryFn: () => api.getPublishLog(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, platform }: { name: string; platform: PlatformStatus }) =>
      api.updatePlatform(name, {
        ...platform.config,
        enabled: !platform.config.enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-200">Publishing</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage platform connections and publication history
        </p>
      </div>

      {/* Platform Cards */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Platforms</h2>

        {loadingPlatforms && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingPlatforms && (!platforms || platforms.length === 0) && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
            <Send className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No platforms configured</p>
            <p className="text-xs text-gray-600 mt-1">
              Platform connections will appear here once the backend is configured
            </p>
          </div>
        )}

        {!loadingPlatforms && platforms && platforms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const meta = PLATFORM_META[platform.name.toLowerCase()] ?? {
                emoji: platform.name[0].toUpperCase(),
                color: 'from-gray-600 to-gray-700',
              };

              return (
                <div
                  key={platform.name}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {meta.emoji}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 capitalize">
                        {platform.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            platform.connected
                              ? 'bg-emerald-400'
                              : 'bg-gray-600'
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {platform.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({
                          name: platform.name,
                          platform,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        platform.config.enabled
                          ? 'bg-indigo-500'
                          : 'bg-white/[0.08]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          platform.config.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Connection hint */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-600">
                    {platform.connected ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {platform.connected
                      ? 'Ready to publish'
                      : 'Configure credentials in backend'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publication Log */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          Publication Log
        </h2>

        {loadingLog && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingLog && (!log || log.length === 0) && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
            <Send className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No publications yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Published videos will appear here
            </p>
          </div>
        )}

        {!loadingLog && log && log.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-500 font-medium uppercase tracking-wider">
              <span className="flex-[2]">Video</span>
              <span className="flex-1">Platform</span>
              <span className="flex-1">Status</span>
              <span className="flex-1">Date</span>
              <span className="w-10" />
            </div>

            {/* Rows */}
            {log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.01] transition"
              >
                <span className="flex-[2] text-sm text-gray-300 truncate">
                  {entry.video_title}
                </span>
                <span className="flex-1 text-sm text-gray-400 capitalize">
                  {entry.platform}
                </span>
                <span className="flex-1">
                  <StatusBadge status={entry.status} />
                </span>
                <span className="flex-1 text-xs text-gray-500">
                  {formatDate(entry.published_at)}
                </span>
                <span className="w-10 text-right">
                  {entry.post_url && (
                    <a
                      href={entry.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
