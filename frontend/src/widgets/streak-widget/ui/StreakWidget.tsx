export const StreakWidget = () => {
    const days = ['M', 'T', 'W', 'T', 'F'];
    const activeDays = ['M', 'T', 'W'];
    const currentDay = 'T';

    return (
        <div className="bg-tertiary-container rounded-xl p-6 relative overflow-hidden shadow-sm">
            {/* Glassy overlay effect */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-on-tertiary-fixed/10 flex items-center justify-center mb-3">
                    <span 
                        className="material-symbols-outlined text-4xl text-on-tertiary-fixed"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        local_fire_department
                    </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-tertiary-fixed mb-1">14-Day Streak</h3>
                <p className="font-body text-sm text-on-tertiary-fixed/80 mb-4">Complete today's tasks to maintain your momentum.</p>
                
                {/* Mini week view */}
                <div className="flex gap-2 justify-center w-full">
                    {days.map((day, index) => {
                        const isActive = activeDays.includes(day) && index < 3;
                        const isToday = day === currentDay && index === 3;
                        
                        if (isActive) {
                            return (
                                <div key={index} className="w-8 h-8 rounded bg-on-tertiary-fixed text-tertiary-container flex items-center justify-center font-label text-xs font-bold">
                                    {day}
                                </div>
                            );
                        }
                        if (isToday) {
                            return (
                                <div key={index} className="w-8 h-8 rounded border-2 border-on-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label text-xs font-bold">
                                    {day}
                                </div>
                            );
                        }
                        return (
                            <div key={index} className="w-8 h-8 rounded bg-on-tertiary-fixed/20 text-on-tertiary-fixed/50 flex items-center justify-center font-label text-xs">
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
