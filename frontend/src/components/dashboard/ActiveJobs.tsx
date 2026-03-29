import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Clock, X, ChevronDown, ChevronRight, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import type { VideoList, Video, PipelineProgress } from '../../lib/types';
import { useT } from '../../lib/i18n';

const STAGES = [
  { key: 'image_gen', en: 'Image Generation', ru: 'Генерация изображений' },
  { key: 'video_gen', en: 'Video Generation', ru: 'Генерация видео' },
  { key: 'tts', en: 'TTS Voiceover', ru: 'Озвучка' },
  { key: 'subtitle', en: 'Subtitles', ru: 'Субтитры' },
  { key: 'assembly', en: 'Assembly', ru: 'Сборка' },
  { key: 'publish', en: 'Publishing', ru: 'Публикация' },
  { key: 'completed', en: 'Completed', ru: 'Завершено' },
];

function useJobProgress(jobId: string, isRunning: boolean) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/pipeline/${jobId}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as PipelineProgress;
      setProgress(data);
      if (data.stage === 'completed' || data.stage === 'failed') {
        ws.close();
      }
    };
    ws.onerror = () => ws.close();
    return () => { ws.close(); };
  }, [jobId, isRunning]);

  return progress;
}

function JobCard({ video }: { video: Video }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const progress = useJobProgress(video.id, video.status === 'running');
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteVideo(video.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  });

  const retryMutation = useMutation({
    mutationFn: (opts: { skip_images?: boolean; skip_video?: boolean }) =>
      api.retryGeneration(video.id, opts),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  });

  const isFailed = video.status === 'failed';
  const currentStage = progress?.stage || (isFailed ? 'failed' : video.status === 'running' ? 'image_gen' : 'pending');
  const percent = progress?.percent || (isFailed ? 100 : video.status === 'pending' ? 5 : 10);
  const message = progress?.message || '';

  const currentStageIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className={`rounded-xl border p-4 ${isFailed ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${isFailed ? 'bg-red-500/10 text-red-300' : 'bg-indigo-500/10 text-indigo-300'}`}>
          {isFailed ? <AlertTriangle className="h-4 w-4" /> : <Clapperboard className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{video.title}</p>
          <p className="text-[11px] text-gray-500">
            {video.content_type}
            {message && <span className="ml-1.5 text-gray-400">— {message}</span>}
          </p>
        </div>
        {!isFailed && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-500 hover:text-gray-300 transition"
            title="Show stages"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {isFailed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => retryMutation.mutate({ skip_images: true, skip_video: true })}
              className="p-1 text-gray-500 hover:text-indigo-400 transition"
              title="Retry (skip images & video)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="p-1 text-gray-600 hover:text-red-400 transition"
              title={t('videoDetail.delete')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <span className={`text-xs font-mono ${isFailed ? 'text-red-400' : 'text-gray-400'}`}>
          {isFailed ? t('videos.status.failed') : `${percent}%`}
        </span>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {isFailed && video.error_message && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 text-[12px] text-red-300">
          {video.error_message}
        </div>
      )}

      {/* Expanded stages */}
      {expanded && !isFailed && (
        <div className="mt-3 space-y-1.5">
          {STAGES.filter(s => s.key !== 'completed').map((stage, idx) => {
            const isDone = idx < currentStageIdx;
            const isCurrent = stage.key === currentStage;
            return (
              <div key={stage.key} className="flex items-center gap-2.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  isDone ? 'bg-emerald-500/20 text-emerald-400' :
                  isCurrent ? 'bg-indigo-500/20 text-indigo-400' :
                  'bg-white/[0.04] text-gray-600'
                }`}>
                  {isDone ? <Check className="h-3 w-3" /> : (idx + 1)}
                </div>
                <span className={`text-[12px] ${
                  isDone ? 'text-emerald-400' :
                  isCurrent ? 'text-indigo-300 font-medium' :
                  'text-gray-600'
                }`}>
                  {stage.en}
                </span>
                {isCurrent && progress?.scene != null && progress.total_scenes > 0 && (
                  <span className="text-[11px] text-gray-500">
                    ({progress.scene}/{progress.total_scenes})
                  </span>
                )}
                {isCurrent && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActiveJobs() {
  const t = useT();
  const { data } = useQuery<VideoList>({
    queryKey: ['videos'],
    queryFn: () => api.getVideos(),
    refetchInterval: 5000,
  });

  const activeVideos = (data?.videos ?? []).filter(
    (v) => v.status === 'running' || v.status === 'pending' || v.status === 'failed',
  );

  if (activeVideos.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-200 mb-4">
          {t('dashboard.activeGenerations')}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">{t('dashboard.noActiveJobs')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <h2 className="text-sm font-medium text-gray-200 mb-4">
        {t('dashboard.activeGenerations')}
      </h2>
      <div className="space-y-3">
        {activeVideos.map((video) => (
          <JobCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
