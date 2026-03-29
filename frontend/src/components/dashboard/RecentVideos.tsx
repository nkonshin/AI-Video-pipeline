import { useQuery } from '@tanstack/react-query';
import { Play, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import { api } from '../../lib/api';
import type { VideoList, Video } from '../../lib/types';
import { useT } from '../../lib/i18n';

const gradients = [
  'from-indigo-600 to-violet-700',
  'from-emerald-600 to-teal-700',
  'from-pink-600 to-rose-700',
];

function StatusBadge({ status, t }: { status: Video['status']; t: (key: string, ...args: any[]) => string }) {
  const config: Record<
    Video['status'],
    { icon: React.ReactNode; label: string; cls: string }
  > = {
    completed: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: t('videos.status.completed'),
      cls: 'bg-emerald-500/20 text-emerald-300',
    },
    running: {
      icon: <Loader className="h-3 w-3" />,
      label: t('videos.status.running'),
      cls: 'bg-amber-500/20 text-amber-300',
    },
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: t('videos.status.pending'),
      cls: 'bg-gray-500/20 text-gray-300',
    },
    failed: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: t('videos.status.failed'),
      cls: 'bg-red-500/20 text-red-300',
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.cls}`}
    >
      {c.icon}
      {c.label}
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

export default function RecentVideos() {
  const t = useT();
  const { data } = useQuery<VideoList>({
    queryKey: ['videos'],
    queryFn: () => api.getVideos(),
  });

  const recentVideos = (data?.videos ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 3);

  if (recentVideos.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-gray-200 mb-4">
          {t('dashboard.recentVideos')}
        </h2>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center text-gray-500">
          <p className="text-sm">{t('dashboard.noVideos')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-200 mb-4">Recent Videos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentVideos.map((video, idx) => (
          <div
            key={video.id}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden group"
          >
            {/* Thumbnail area */}
            <div
              className={`relative h-36 bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center`}
            >
              <div className="absolute inset-0 bg-black/20" />
              <button
                className="relative z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label={`Play ${video.title}`}
              >
                <Play className="h-4 w-4 ml-0.5" />
              </button>
              <div className="absolute top-3 right-3 z-10">
                <StatusBadge status={video.status} t={t} />
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-200 truncate">
                {video.title}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] uppercase tracking-wider text-gray-500">
                  {video.content_type}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(video.created_at)}
                </span>
              </div>
              {video.cost > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Cost: ${video.cost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
