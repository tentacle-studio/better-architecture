import type { LearningPath } from '../model/learning-path';

interface OngoingPathCardProps {
  path: LearningPath;
}

export const OngoingPathCard = ({ path }: OngoingPathCardProps) => {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 hover:bg-surface-container transition-colors cursor-pointer group border border-outline-variant/10">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-headline font-bold text-on-surface text-sm">{path.title}</h4>
        <span className="text-primary font-label text-xs font-bold">{path.progress}%</span>
      </div>
      <p className="text-xs font-label text-on-surface-variant mb-3 uppercase tracking-wider">{path.category}</p>
      
      {/* Progress Bar */}
      <div className="w-full bg-surface-container-highest rounded-full h-1.5 mb-3 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-primary to-primary-container h-1.5 rounded-full" 
          style={{ width: `${path.progress}%` }} 
        />
      </div>
      
      <div className="flex items-center justify-between text-xs font-label text-on-surface-variant">
        <span>{path.moduleInfo}</span>
        <span className="text-primary group-hover:translate-x-1 transition-transform inline-block">Continue →</span>
      </div>
    </div>
  );
};
