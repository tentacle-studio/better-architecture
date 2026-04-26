export function ConsistencyStats() {
  const days = [
    { label: 'M', height: 'h-12', active: true },
    { label: 'T', height: 'h-16', active: true },
    { label: 'W', height: 'h-8', active: true },
    { label: 'T', height: 'h-20', active: true },
    { label: 'F', height: 'h-14', active: true },
    { label: 'S', height: 'h-4', active: false },
    { label: 'S', height: 'h-2', active: false },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary-container opacity-20 rounded-full blur-2xl"></div>
      <div className="relative z-10 mb-4">
        <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-1">Consistency</p>
        <h3 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          14 Day Streak{' '}
          <span className="material-symbols-outlined text-secondary text-xl">
            local_fire_department
          </span>
        </h3>
      </div>
      <div className="flex justify-between items-end h-24 relative z-10 gap-2">
        {days.map((day) => (
          <div key={day.label} className={`flex flex-col items-center gap-2 w-full ${!day.active ? 'opacity-50' : ''}`}>
            <div className={`w-full bg-primary rounded-t-lg ${day.active ? day.height : 'bg-surface-container-highest ' + day.height}`}></div>
            <span className="font-label text-xs text-on-surface-variant font-medium">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
