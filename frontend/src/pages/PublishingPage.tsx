import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  X,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import type { PlatformStatus, PublishLogEntry } from '../lib/types';
import { useT } from '../lib/i18n';

const PLATFORM_META: Record<string, { emoji: string; color: string }> = {
  telegram: { emoji: 'T', color: 'from-sky-500 to-blue-600' },
  instagram: { emoji: 'I', color: 'from-pink-500 to-purple-600' },
  youtube: { emoji: 'Y', color: 'from-red-500 to-red-700' },
  vk: { emoji: 'V', color: 'from-blue-500 to-blue-700' },
  tiktok: { emoji: 'K', color: 'from-gray-700 to-gray-900' },
};

// Credential fields for each platform
const PLATFORM_FIELDS: Record<string, { key: string; label: string; secret?: boolean; placeholder: string }[]> = {
  telegram: [
    { key: 'bot_token', label: 'Bot Token', secret: true, placeholder: '123456:ABC-DEF...' },
    { key: 'channel_id', label: 'Channel ID', placeholder: '@your_channel or -100123...' },
  ],
  instagram: [
    { key: 'username', label: 'Username', placeholder: 'your_username' },
    { key: 'password', label: 'Password', secret: true, placeholder: 'your_password' },
  ],
  youtube: [
    { key: 'client_secrets', label: 'Client Secrets (JSON)', placeholder: 'Paste client_secret.json content' },
  ],
  vk: [
    { key: 'access_token', label: 'Access Token', secret: true, placeholder: 'vk1.a.your_token...' },
    { key: 'group_id', label: 'Group ID', placeholder: '123456789' },
  ],
  tiktok: [
    { key: 'session_id', label: 'Session ID', secret: true, placeholder: 'your_session_id' },
  ],
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    published: { icon: <CheckCircle className="h-3 w-3" />, cls: 'bg-emerald-500/20 text-emerald-300' },
    success: { icon: <CheckCircle className="h-3 w-3" />, cls: 'bg-emerald-500/20 text-emerald-300' },
    failed: { icon: <AlertCircle className="h-3 w-3" />, cls: 'bg-red-500/20 text-red-300' },
    pending: { icon: <Clock className="h-3 w-3" />, cls: 'bg-gray-500/20 text-gray-300' },
  };
  const c = map[status] ?? map['pending'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.cls}`}>
      {c.icon}{status}
    </span>
  );
}

/* ── Config Modal ── */

function ConfigModal({ platform, onClose }: { platform: PlatformStatus; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fields = PLATFORM_FIELDS[platform.name] ?? [];

  const [credentials, setCredentials] = useState<Record<string, string>>(
    () => ({ ...platform.config.credentials })
  );
  const [hashtags, setHashtags] = useState(platform.config.hashtags.join(', '));
  const [captionTemplate, setCaptionTemplate] = useState(platform.config.caption_template);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => api.updatePlatform(platform.name, {
      enabled: platform.config.enabled,
      credentials,
      hashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
      caption_template: captionTemplate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/[0.08] rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${PLATFORM_META[platform.name]?.color ?? 'from-gray-600 to-gray-700'} flex items-center justify-center text-white font-bold text-sm`}>
              {PLATFORM_META[platform.name]?.emoji ?? platform.name[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-200 capitalize">{platform.name}</h3>
              <p className="text-[11px] text-gray-500">Configure credentials and settings</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Credentials */}
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
              <div className="relative">
                <input
                  type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                  value={credentials[field.key] ?? ''}
                  onChange={e => setCredentials({ ...credentials, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 pr-10 focus:outline-none focus:border-indigo-500/50 transition"
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Hashtags */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hashtags</label>
            <input
              type="text"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="shorts, ai, video (comma separated)"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
            />
          </div>

          {/* Caption template */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Caption Template</label>
            <textarea
              value={captionTemplate}
              onChange={e => setCaptionTemplate(e.target.value)}
              placeholder="{title} | AI generated video"
              rows={2}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition resize-none"
            />
            <p className="text-[11px] text-gray-600 mt-1">Use {'{title}'} and {'{description}'} as placeholders</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Saved
            </div>
          )}
          {!saved && <div />}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function PublishingPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [configuring, setConfiguring] = useState<PlatformStatus | null>(null);

  const { data: platforms, isLoading: loadingPlatforms } = useQuery<PlatformStatus[]>({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatforms(),
  });

  const { data: log, isLoading: loadingLog } = useQuery<PublishLogEntry[]>({
    queryKey: ['publish-log'],
    queryFn: () => api.getPublishLog(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, platform }: { name: string; platform: PlatformStatus }) =>
      api.updatePlatform(name, { ...platform.config, enabled: !platform.config.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-200">{t('publishing.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('publishing.subtitle')}</p>
      </div>

      {/* Platform Cards */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">{t('publishing.platforms')}</h2>

        {loadingPlatforms && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingPlatforms && platforms && platforms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const meta = PLATFORM_META[platform.name.toLowerCase()] ?? {
                emoji: platform.name[0].toUpperCase(),
                color: 'from-gray-600 to-gray-700',
              };
              const hasCredentials = Object.keys(platform.config.credentials).length > 0;

              return (
                <div key={platform.name} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 capitalize">{platform.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`h-2 w-2 rounded-full ${hasCredentials ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-500">
                          {hasCredentials ? t('publishing.connected') : t('publishing.notConfigured')}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ name: platform.name, platform })}
                      disabled={toggleMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        platform.config.enabled ? 'bg-indigo-500' : 'bg-white/[0.08]'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        platform.config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Configure button */}
                  <button
                    onClick={() => setConfiguring(platform)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition"
                  >
                    <Settings className="h-3 w-3" />
                    {hasCredentials ? 'Edit credentials' : 'Add credentials'}
                  </button>

                  {/* Show configured fields preview */}
                  {hasCredentials && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.keys(platform.config.credentials).map(key => (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{key}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publication Log */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">{t('publishing.log')}</h2>

        {loadingLog && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingLog && (!log || log.length === 0) && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
            <Send className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t('publishing.noPublications')}</p>
          </div>
        )}

        {!loadingLog && log && log.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-500 font-medium uppercase tracking-wider">
              <span className="flex-[2]">Video</span>
              <span className="flex-1">Platform</span>
              <span className="flex-1">Status</span>
              <span className="flex-1">Date</span>
              <span className="w-10" />
            </div>
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.01] transition">
                <span className="flex-[2] text-sm text-gray-300 truncate">{entry.video_title}</span>
                <span className="flex-1 text-sm text-gray-400 capitalize">{entry.platform}</span>
                <span className="flex-1"><StatusBadge status={entry.status} /></span>
                <span className="flex-1 text-xs text-gray-500">{formatDate(entry.published_at)}</span>
                <span className="w-10 text-right">
                  {entry.post_url && (
                    <a href={entry.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config Modal */}
      {configuring && (
        <ConfigModal platform={configuring} onClose={() => setConfiguring(null)} />
      )}
    </div>
  );
}
