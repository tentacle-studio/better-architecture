import { OngoingPathCard } from '@entities/path';
import type { LearningPath } from '@entities/path';
import { Flame, Trophy } from 'lucide-react';

export const OngoingPathsList = () => {
  const ongoingPaths: LearningPath[] = [
    {
      id: 'o1',
      title: 'Kubernetes Fundamentals',
      category: 'DevOps Track',
      progress: 45,
      moduleInfo: 'Module 3 of 8',
      description: '',
      colorScheme: 'primary',
      duration: '',
      level: 'Beginner',
    },
    {
      id: 'o2',
      title: 'React State Architecture',
      category: 'Frontend Track',
      progress: 82,
      moduleInfo: 'Final Project',
      description: '',
      colorScheme: 'primary',
      duration: '',
      level: 'Advanced',
    },
  ];

  return (
    <aside className="w-full lg:w-80 space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900">
        Continue Learning
      </h2>

      <div className="space-y-4">
        {ongoingPaths.map((path) => (
          <OngoingPathCard key={path.id} path={path} />
        ))}
      </div>

      {/* Achievement Highlight */}
      <div className="mt-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 relative overflow-hidden shadow-[8px_8px_24px_rgba(249,115,22,0.3),inset_2px_2px_8px_rgba(255,255,255,0.3)]">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-tr-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white font-extrabold text-lg leading-tight">Weekly Streak</h4>
              <p className="text-white/80 font-semibold text-sm">4 days active</p>
            </div>
          </div>

          <p className="text-white/90 text-sm mb-4 font-medium">You're on fire! Keep the momentum going.</p>

          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5 w-fit shadow-inner">
            <Trophy className="w-4 h-4 text-amber-200" />
            <span className="text-white font-bold text-sm">+50 XP earned</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
