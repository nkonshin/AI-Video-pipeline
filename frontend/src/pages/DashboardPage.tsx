import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import StatsCards from '../components/dashboard/StatsCards';
import ActiveJobs from '../components/dashboard/ActiveJobs';
import RecentVideos from '../components/dashboard/RecentVideos';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of your video pipeline
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

      {/* Stats */}
      <StatsCards />

      {/* Active Jobs */}
      <ActiveJobs />

      {/* Recent Videos */}
      <RecentVideos />
    </div>
  );
}
