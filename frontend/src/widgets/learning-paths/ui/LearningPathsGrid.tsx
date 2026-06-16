import { PathCard } from '@entities/path';
import type { LearningPath } from '@entities/path';
import { Filter } from 'lucide-react';

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
      {/* Section Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
          Explore Learning Paths
        </h2>
        <p className="text-slate-600">
          Choose from our curated collection of industry-focused pathways
        </p>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-[3px_3px_8px_rgba(79,70,229,0.08)]">
          <Filter className="w-4 h-4 text-slate-400" />
        </div>
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-200 border-2 ${
              i === 0
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-[4px_4px_12px_rgba(79,70,229,0.3)]'
                : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 shadow-[2px_2px_8px_rgba(79,70,229,0.06)]'
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
