import { PathCard } from '@entities/path';
import type { LearningPath } from '@entities/path';

export const LearningPathsGrid = () => {
  const paths: LearningPath[] = [
    {
      id: '1',
      title: 'Advanced System Design',
      description: 'Architect scalable, highly available systems for millions of users. Deep dive into microservices, caching, and database sharding.',
      category: 'System Design',
      duration: '40 Hrs',
      level: 'Advanced',
      colorScheme: 'primary',
    },
    {
      id: '2',
      title: 'AWS Solutions Architect',
      description: 'Comprehensive guide to AWS services. Prepare for the certification with practical labs spanning compute, storage, and networking.',
      category: 'Cloud',
      duration: '65 Hrs',
      level: 'Intermediate',
      colorScheme: 'secondary',
    },
    {
      id: '3',
      title: 'Zero Trust Architecture',
      description: 'Implement modern security paradigms. Learn identity management, network segmentation, and continuous verification principles.',
      category: 'Security',
      duration: '25 Hrs',
      level: 'Advanced',
      colorScheme: 'tertiary',
    },
    {
      id: '4',
      title: 'Modern Web Performance',
      description: 'Optimize web applications for speed and core web vitals. Techniques for lazy loading, rendering patterns, and bundle analysis.',
      category: 'Frontend',
      duration: '15 Hrs',
      level: 'Intermediate',
      colorScheme: 'primary',
    },
  ];

  const categories = ['All Paths', 'Cloud', 'DevOps', 'System Design', 'Security', 'Frontend'];

  return (
    <div className="flex-1 space-y-8">
      {/* Categories */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 hide-scrollbar">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-6 py-2.5 rounded-full font-label text-sm whitespace-nowrap transition-colors ${
              i === 0 
                ? 'bg-primary text-on-primary font-bold shadow-sm' 
                : 'bg-surface-container-highest text-on-surface hover:bg-surface-dim font-medium'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paths.map((path) => (
          <PathCard key={path.id} path={path} />
        ))}
      </div>
    </div>
  );
};
