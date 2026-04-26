const paths = [
  {
    id: 1,
    title: '100 Days of DevOps',
    sub: 'Day 42/100 • CI/CD Pipelines',
    progress: '42%',
    icon: 'cloud_sync',
    iconColor: 'text-primary'
  },
  {
    id: 2,
    title: 'Advanced System Design',
    sub: 'Module 3 • Microservices',
    progress: '28%',
    icon: 'schema',
    iconColor: 'text-secondary'
  }
];

export function ActivePathsProgress() {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-on-surface">Active Paths</h3>
        <button className="text-primary text-sm font-semibold hover:underline">View All</button>
      </div>
      <div className="space-y-4">
        {paths.map((path) => (
          <div
            key={path.id}
            className="bg-surface-container-lowest p-5 rounded-lg flex items-center justify-between transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                <span className={`material-symbols-outlined ${path.iconColor} text-2xl`}>
                  {path.icon}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-base">{path.title}</h4>
                <p className="font-label text-xs text-on-surface-variant">{path.sub}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-label text-lg font-bold ${path.iconColor}`}>
                {path.progress}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
