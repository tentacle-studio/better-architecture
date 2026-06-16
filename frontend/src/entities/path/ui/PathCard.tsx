import type { LearningPath } from '../model/learning-path';
import { cn } from '@shared/lib/utils';
import { Clock, TrendingUp, Bookmark, ArrowRight } from 'lucide-react';

interface PathCardProps {
  path: LearningPath;
}

export const PathCard = ({ path }: PathCardProps) => {
  const colorMap = {
    primary: {
      bg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-indigo-600',
      text: 'text-indigo-600',
      lightBg: 'bg-indigo-100',
      hover: 'hover:shadow-indigo-200',
    },
    secondary: {
      bg: 'bg-violet-500',
      gradient: 'from-violet-500 to-violet-600',
      text: 'text-violet-600',
      lightBg: 'bg-violet-100',
      hover: 'hover:shadow-violet-200',
    },
    tertiary: {
      bg: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
      text: 'text-blue-600',
      lightBg: 'bg-blue-100',
      hover: 'hover:shadow-blue-200',
    },
  };

  const style = colorMap[path.colorScheme as keyof typeof colorMap] || colorMap.primary;

  return (
    <div className={cn(
      "relative bg-white rounded-3xl p-6 border-3 border-white transition-all duration-300 cursor-pointer",
      "shadow-[6px_8px_20px_rgba(79,70,229,0.12),inset_2px_2px_8px_rgba(255,255,255,0.8)]",
      "hover:shadow-[8px_12px_30px_rgba(79,70,229,0.18),inset_2px_2px_8px_rgba(255,255,255,0.9)]",
      "hover:-translate-y-1",
      style.hover
    )}>
      {/* Decorative corner accent */}
      <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-20", style.bg)} />

      <div className="relative">
        {/* Category badge */}
        <div className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider mb-4", style.lightBg, style.text)}>
          <TrendingUp className="w-3.5 h-3.5" />
          {path.category}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">{path.title}</h3>

        {/* Description */}
        <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-2">{path.description}</p>

        {/* Meta info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold">
            <Clock className="w-4 h-4 text-slate-400" />
            {path.duration}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold">
            <Bookmark className="w-4 h-4 text-slate-400" />
            {path.level}
          </div>
        </div>

        {/* Arrow button */}
        <div className="flex items-center justify-end">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200",
            style.lightBg, style.text,
            "hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1)]"
          )}>
            Start Path
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
