import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader,
  Film,
} from 'lucide-react';
import { api } from '../lib/api';
import type { VideoList, Video } from '../lib/types';

const gradients = [
  'from-indigo-600 to-violet-700',
  'from-emerald-600 to-teal-700',
  'from-pink-600 to-rose-700',
  'from-amber-600 to-orange-700',
  'from-cyan-600 to-blue-700',
];

const CONTENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'fruit-soap', label: 'Fruit Soap' },
  { value: 'character-remix', label: 'Character Remix' },
  { value: 'mascot', label: 'Mascot' },
  { value: 'custom', label: 'Custom' },
];

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

function StatusBadge({ status }: { status: Video['status'] }) {
  const config: Record<
    Video['status'],
    { icon: React.ReactNode; label: string; cls: string }
  > = {
    completed: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Completed',
      cls: 'bg-emerald-500/20 text-emerald-300',
    },
    running: {
      icon: <Loader className="h-3 w-3 animate-spin" />,
      label: 'Running',
      cls: 'bg-indigo-500/20 text-indigo-300 animate-pulse',
    },
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: 'Pending',
      cls: 'bg-gray-500/20 text-gray-300',
    },
    failed: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Failed',
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

export default function VideosPage() {
  const navigate = useNavigate();
  const [contentType, setContentType] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery<VideoList>({
    queryKey: ['videos', { status, content_type: contentType }],
    queryFn: () =>
      api.getVideos({
        status: status || undefined,
        content_type: contentType || undefined,
      }),
  });

  const videos = (data?.videos ?? [])
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
          <h1 className="text-xl font-semibold text-gray-200">My Videos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Browse and manage your videos
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition"
        >
          <Plus className="h-4 w-4" />
          New Video
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-indigo-500/50 transition"
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-indigo-500/50 transition"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {data && (
          <span className="text-xs text-gray-500 ml-auto">
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && videos.length === 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
          <Film className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No videos yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Create your first video to get started
          </p>
        </div>
      )}

      {/* Video grid */}
      {!isLoading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video, idx) => (
            <div
              key={video.id}
              onClick={() => navigate(`/videos/${video.id}`)}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden group cursor-pointer hover:border-white/[0.12] transition-colors"
            >
              {/* Thumbnail */}
              <div
                className={`relative h-36 bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center`}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Play className="h-4 w-4 ml-0.5" />
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <StatusBadge status={video.status} />
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {video.title}
                </p>
                <div className="flex items-center justify-between">
                  <ContentTypeBadge type={video.content_type} />
                  <span className="text-xs text-gray-500">
                    {formatDate(video.created_at)}
                  </span>
                </div>
                {video.cost > 0 && (
                  <p className="text-xs text-gray-500">
                    Cost: ${video.cost.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
