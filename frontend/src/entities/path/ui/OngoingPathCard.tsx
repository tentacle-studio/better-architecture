import type { LearningPath } from '../model/learning-path';
import { Play } from 'lucide-react';

interface OngoingPathCardProps {
  path: LearningPath;
}

export const OngoingPathCard = ({ path }: OngoingPathCardProps) => {
  return (
    <div className="bg-white rounded-3xl p-5 border-3 border-white cursor-pointer group
      shadow-[6px_8px_20px_rgba(79,70,229,0.12),inset_2px_2px_8px_rgba(255,255,255,0.8)]
      hover:shadow-[8px_12px_30px_rgba(79,70,229,0.18),inset_2px_2px_8px_rgba(255,255,255,0.9)]
      hover:-translate-y-0.5 transition-all duration-200">

      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors">
            {path.title}
          </h4>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{path.category}</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[4px_4px_12px_rgba(79,70,229,0.25)]">
          <span className="text-white font-extrabold text-sm">{path.progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)]">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full relative"
          style={{ width: `${path.progress}%` }}
        >
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{path.moduleInfo}</span>
        <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
          Continue
          <Play className="w-4 h-4 fill-current" />
        </div>
      </div>
    </div>
  );
};
