export const ProgressWidget = () => {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 relative overflow-hidden">
      <h3 className="font-headline font-bold text-lg mb-6 text-on-surface">Today's Progress</h3>
      <div className="flex justify-center mb-4 relative">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
          <circle 
            className="stroke-surface-container-highest" 
            cx="60" 
            cy="60" 
            fill="none" 
            r="54"
            strokeWidth="8"
          />
          <circle 
            className="stroke-primary" 
            cx="60" 
            cy="60" 
            fill="none" 
            r="54"
            strokeDasharray="339.292" 
            strokeDashoffset="254.469" 
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-label text-3xl font-bold text-on-background">25%</span>
          <span className="font-label text-xs text-on-surface-variant">1/4 Tasks</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-body text-sm text-on-surface-variant">Keep going! You're on track to finish before 5 PM.</p>
      </div>
    </div>
  );
};
