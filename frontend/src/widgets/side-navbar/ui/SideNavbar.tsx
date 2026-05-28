import { Link, useLocation } from 'react-router-dom';
import { cn } from '@shared/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  CalendarX2,
  BarChart3,
  HelpCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const SideNavbar = () => {
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Curriculum', icon: BookOpen, href: '/roadmap' },
    { label: 'Daily Tasks', icon: CalendarX2, href: '/daily-tasks' },
    { label: 'Progress', icon: BarChart3, href: '/progress' },
    { label: 'Certificates', icon: Sparkles, href: '/certificates' },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen w-72 fixed left-0 top-0 z-40 bg-gradient-to-b from-indigo-50/50 to-violet-50/50">
      {/* User Profile Card */}
      <div className="px-6 pt-8 pb-4">
        <div className="bg-white rounded-3xl p-5 shadow-[6px_8px_20px_rgba(79,70,229,0.12),inset_2px_2px_8px_rgba(255,255,255,0.8)] border-3 border-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-[4px_4px_12px_rgba(79,70,229,0.3)]">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-3 border-white" />
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-lg">The Scholar</h2>
              <p className="text-indigo-600 font-semibold text-sm">Level 12 Architect</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-indigo-700 font-bold text-sm">1,240 XP</span>
          </div>
        </div>
      </div>

      {/* Daily Lab CTA */}
      <div className="px-6 mb-6">
        <button className="w-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold py-4 px-5 rounded-2xl shadow-[6px_6px_20px_rgba(16,185,129,0.3),-2px_-2px_8px_rgba(255,255,255,0.3)_inset] hover:shadow-[8px_8px_28px_rgba(16,185,129,0.4),-2px_-2px_8px_rgba(255,255,255,0.4)_inset] hover:translate-y-[-2px] active:translate-y-[1px] transition-all duration-200 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5" />
          Start Daily Lab
        </button>
      </div>

      {/* Navigation Menu */}
      <ul className="flex flex-col flex-grow gap-3 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <li key={item.label}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-4 py-3.5 px-5 rounded-2xl font-semibold transition-all duration-200",
                  isActive
                    ? "bg-white text-indigo-700 shadow-[6px_8px_20px_rgba(79,70,229,0.15),inset_2px_2px_8px_rgba(255,255,255,0.8)] border-2 border-indigo-100"
                    : "text-slate-600 hover:bg-white/70 hover:text-indigo-600 shadow-[3px_3px_10px_rgba(79,70,229,0.06)]"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer Links */}
      <div className="p-4 space-y-2">
        <Link
          to="/help"
          className="flex items-center gap-4 px-5 py-3 text-slate-500 hover:text-indigo-600 hover:bg-white/70 rounded-xl transition-all font-medium shadow-[2px_2px_8px_rgba(79,70,229,0.04)] hover:shadow-[4px_4px_12px_rgba(79,70,229,0.12)]"
        >
          <HelpCircle className="w-5 h-5" />
          Help Center
        </Link>
        <Link
          to="/logout"
          className="flex items-center gap-4 px-5 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium shadow-[2px_2px_8px_rgba(79,70,229,0.04)] hover:shadow-[4px_4px_12px_rgba(220,38,38,0.12)]"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Link>
      </div>
    </nav>
  );
};
