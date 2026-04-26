import type { LearningPath } from '../model/learning-path';
import { cn } from '@shared/lib/utils';

interface PathCardProps {
  path: LearningPath;
}

export const PathCard = ({ path }: PathCardProps) => {
  const colorMap = {
    primary: 'from-primary to-primary-container',
    secondary: 'from-secondary to-secondary-container',
    tertiary: 'from-tertiary to-tertiary-container',
  };

  const textColorMap = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20 hover:shadow-md transition-shadow flex flex-col h-full group relative overflow-hidden">
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full bg-gradient-to-b group-hover:w-1.5 transition-all",
        colorMap[path.colorScheme]
      )} />
      
      <div className="flex justify-between items-start mb-4">
        <span className={cn(
          "bg-surface-container-low font-label text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",
          textColorMap[path.colorScheme]
        )}>
          {path.category}
        </span>
        <span className="material-symbols-outlined text-outline">bookmark_border</span>
      </div>

      <h3 className="text-xl font-headline font-bold text-on-surface mb-2">{path.title}</h3>
      <p className="text-on-surface-variant font-body text-sm mb-6 flex-grow">{path.description}</p>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-on-surface-variant font-label text-xs">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{path.duration}</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label text-xs">
            <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
            <span>{path.level}</span>
          </div>
        </div>
        <button className={cn(
          "p-1 rounded-full hover:bg-surface-container-low transition-colors",
          textColorMap[path.colorScheme]
        )}>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
