import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import type { VideoList, Video } from '../../lib/types';
import { useT } from '../../lib/i18n';

function progressForStage(status: Video['status']): number {
  switch (status) {
    case 'pending':
      return 10;
    case 'running':
      return 55;
    case 'completed':
      return 100;
    case 'failed':
      return 100;
    default:
      return 0;
  }
}

function stageLabelFor(status: Video['status']): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'running':
      return 'Generating';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export default function ActiveJobs() {
  const t = useT();
  const { data } = useQuery<VideoList>({
    queryKey: ['videos'],
    queryFn: () => api.getVideos(),
    refetchInterval: 5000,
  });

  const activeVideos = (data?.videos ?? []).filter(
    (v) => v.status === 'running' || v.status === 'pending',
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
        Active Generations
      </h2>
      <div className="space-y-4">
        {activeVideos.map((video) => {
          const pct = progressForStage(video.status);
          const stageLabel = stageLabelFor(video.status);

          return (
            <div
              key={video.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-500/10 rounded-lg p-2 text-indigo-300">
                  <Clapperboard className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {video.title}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500">
                    {video.content_type} &middot; {stageLabel}
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
