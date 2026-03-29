import { useQuery } from '@tanstack/react-query';
import { Film, DollarSign, Share2, Loader } from 'lucide-react';
import { api } from '../../lib/api';
import type { VideoList, Budget } from '../../lib/types';
import { useT } from '../../lib/i18n';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  bgGlow: string;
}

export default function StatsCards() {
  const t = useT();
  const { data: videoData } = useQuery<VideoList>({
    queryKey: ['videos'],
    queryFn: () => api.getVideos(),
  });

  const { data: budget } = useQuery<Budget>({
    queryKey: ['budget'],
    queryFn: () => api.getBudget(),
  });

  const videos = videoData?.videos ?? [];
  const totalVideos = videoData?.total ?? 0;
  const published = videos.filter(
    (v) => v.publications && v.publications.length > 0,
  ).length;
  const activeJobs = videos.filter((v) => v.status === 'running').length;
  const budgetSpent = budget?.spent ?? 0;

  const cards: StatCard[] = [
    {
      label: t('dashboard.totalVideos'),
      value: String(totalVideos),
      icon: <Film className="h-4 w-4" />,
      accent: 'text-indigo-300',
      bgGlow: 'bg-indigo-500/10',
    },
    {
      label: t('dashboard.budgetSpent'),
      value: `$${budgetSpent.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4" />,
      accent: 'text-emerald-300',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      label: t('dashboard.published'),
      value: String(published),
      icon: <Share2 className="h-4 w-4" />,
      accent: 'text-pink-300',
      bgGlow: 'bg-pink-500/10',
    },
    {
      label: t('dashboard.activeJobs'),
      value: String(activeJobs),
      icon: <Loader className="h-4 w-4" />,
      accent: 'text-amber-300',
      bgGlow: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex items-start justify-between"
        >
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500">
              {card.label}
            </p>
            <p className={`text-2xl font-semibold mt-1 ${card.accent}`}>
              {card.value}
            </p>
          </div>
          <div className={`${card.bgGlow} rounded-lg p-2.5 ${card.accent}`}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
