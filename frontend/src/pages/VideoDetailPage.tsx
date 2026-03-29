import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader,
  Trash2,
  Send,
  ExternalLink,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Video, PlatformStatus } from '../lib/types';
import { useT } from '../lib/i18n';

function StatusBadge({ status, t }: { status: Video['status']; t: (key: string, ...args: any[]) => string }) {
  const config: Record<
    Video['status'],
    { icon: React.ReactNode; label: string; cls: string }
  > = {
    completed: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: t('videos.status.completed'),
      cls: 'bg-emerald-500/20 text-emerald-300',
    },
    running: {
      icon: <Loader className="h-3.5 w-3.5 animate-spin" />,
      label: t('videos.status.running'),
      cls: 'bg-indigo-500/20 text-indigo-300 animate-pulse',
    },
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      label: t('videos.status.pending'),
      cls: 'bg-gray-500/20 text-gray-300',
    },
    failed: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: t('videos.status.failed'),
      cls: 'bg-red-500/20 text-red-300',
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.cls}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlatformSelector({
  onPublish,
  onClose,
  publishing,
}: {
  onPublish: (platforms: string[]) => void;
  onClose: () => void;
  publishing: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: platforms } = useQuery<PlatformStatus[]>({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatforms(),
  });

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Select platforms</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {platforms && platforms.length > 0 ? (
        <div className="space-y-2">
          {platforms.map((p) => (
            <label
              key={p.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.name)}
                onChange={() => toggle(p.name)}
                className="rounded border-white/20 bg-white/[0.05] text-indigo-500 focus:ring-indigo-500/50"
              />
              <span className="text-sm text-gray-300 capitalize">
                {p.name}
              </span>
              {p.connected ? (
                <span className="text-[10px] text-emerald-400 ml-auto">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] text-gray-600 ml-auto">
                  Not connected
                </span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No platforms configured</p>
      )}

      <button
        onClick={() => onPublish(selected)}
        disabled={selected.length === 0 || publishing}
        className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {publishing ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Publish to {selected.length} platform
            {selected.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  );
}

export default function VideoDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showPublish, setShowPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: video,
    isLoading,
    error,
  } = useQuery<Video>({
    queryKey: ['video', id],
    queryFn: () => api.getVideo(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteVideo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      navigate('/videos');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (platforms: string[]) => api.publishVideo(id!, platforms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      setShowPublish(false);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !video) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/videos')}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('videoDetail.backToVideos')}
        </button>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {error ? String(error) : 'Video not found'}
          </p>
        </div>
      </div>
    );
  }

  const scenarioConfig = video.scenario_config as {
    scenes?: Array<{
      scene_id?: string;
      description?: string;
      image_prompt?: string;
      voiceover_text?: string;
    }>;
    image_model?: string;
    video_model?: string;
    tts_voice?: string;
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/videos')}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Videos
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-200">
              {video.title}
            </h1>
            <StatusBadge status={video.status} t={t} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="uppercase tracking-wider">
              {video.content_type}
            </span>
            <span>{t('videoDetail.created')} {formatDate(video.created_at)}</span>
            {video.completed_at && (
              <span>{t('videoDetail.completed')} {formatDate(video.completed_at)}</span>
            )}
            {video.cost > 0 && <span>{t('videoDetail.cost')}: ${video.cost.toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {/* Error message */}
      {video.error_message && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-300">{video.error_message}</p>
        </div>
      )}

      {/* Video player */}
      {video.output_path && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <video
            src={`/media/${video.output_path.replace(/^output\//, '')}`}
            controls
            className="w-full max-w-3xl mx-auto rounded-lg bg-black"
          />
        </div>
      )}

      {/* Scenario config */}
      {scenarioConfig.scenes && scenarioConfig.scenes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-200">{t('videoDetail.scenes')}</h2>
          <div className="space-y-3">
            {scenarioConfig.scenes.map((scene, idx) => (
              <div
                key={scene.scene_id ?? idx}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">
                    Scene {idx + 1}
                  </span>
                </div>
                {scene.description && (
                  <p className="text-sm text-gray-300">{scene.description}</p>
                )}
                {scene.image_prompt && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                      Image prompt
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {scene.image_prompt}
                    </p>
                  </div>
                )}
                {scene.voiceover_text && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                      Voiceover
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {scene.voiceover_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Model info */}
          {(scenarioConfig.image_model ||
            scenarioConfig.video_model ||
            scenarioConfig.tts_voice) && (
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              {scenarioConfig.image_model && (
                <span>Image: {scenarioConfig.image_model}</span>
              )}
              {scenarioConfig.video_model && (
                <span>Video: {scenarioConfig.video_model}</span>
              )}
              {scenarioConfig.tts_voice && (
                <span>Voice: {scenarioConfig.tts_voice}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Publications */}
      {video.publications && video.publications.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-200">{t('videoDetail.publications')}</h2>
          <div className="space-y-2">
            {video.publications.map((pub) => (
              <div
                key={pub.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 capitalize">
                    {pub.platform}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      pub.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : pub.status === 'failed'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-gray-500/20 text-gray-300'
                    }`}
                  >
                    {pub.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {pub.error_message && (
                    <span className="text-xs text-red-400">
                      {pub.error_message}
                    </span>
                  )}
                  {pub.post_url && (
                    <a
                      href={pub.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDate(pub.published_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish selector */}
      {showPublish && (
        <PlatformSelector
          onPublish={(platforms) => publishMutation.mutate(platforms)}
          onClose={() => setShowPublish(false)}
          publishing={publishMutation.isPending}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        {video.status === 'completed' && !showPublish && (
          <button
            onClick={() => setShowPublish(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition"
          >
            <Send className="h-4 w-4" />
            {t('videoDetail.publish')}
          </button>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition"
          >
            <Trash2 className="h-4 w-4" />
            {t('videoDetail.delete')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('videoDetail.confirmDelete')}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
