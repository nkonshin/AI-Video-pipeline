import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Film,
  BookOpen,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create', icon: PlusCircle, label: 'Create Video' },
  { to: '/videos', icon: Film, label: 'My Videos' },
  { to: '/scenarios', icon: BookOpen, label: 'Scenarios' },
  { to: '/publishing', icon: Share2, label: 'Publishing' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-white/[0.06] bg-white/[0.015] transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
          <Play className="h-3.5 w-3.5 text-white fill-white" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold text-white">Video Pipeline</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors',
                isActive
                  ? 'bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-300',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.04] px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors',
              isActive
                ? 'bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 font-medium'
                : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-400',
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && 'Settings'}
        </NavLink>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-400 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
