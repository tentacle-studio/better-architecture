import { OngoingPathCard } from '@entities/path';
import type { LearningPath } from '@entities/path';

export const OngoingPathsList = () => {
  const ongoingPaths: LearningPath[] = [
    {
      id: 'o1',
      title: 'Kubernetes Fundamentals',
      category: 'DevOps Track',
      progress: 45,
      moduleInfo: 'Module 3 of 8',
      description: '', // Required by type but not used here
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
      <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">Ongoing Paths</h2>
      <div className="space-y-4">
        {ongoingPaths.map((path) => (
          <OngoingPathCard key={path.id} path={path} />
        ))}
      </div>

      {/* Achievement Highlight */}
      <div className="mt-8 bg-tertiary-container text-on-tertiary-container rounded-xl p-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-2 opacity-20 text-6xl">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            workspace_premium
          </span>
        </div>
        <div className="relative z-10">
          <h4 className="font-headline font-bold mb-1">Weekly Streak</h4>
          <p className="text-sm font-body opacity-90 mb-3">You're on fire! 4 days active this week.</p>
          <span className="inline-block bg-white/20 px-3 py-1 rounded-full font-label text-xs tracking-widest font-bold">
            +50 XP
          </span>
        </div>
      </div>
    </aside>
  );
};
