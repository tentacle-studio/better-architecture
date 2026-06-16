export const RoadmapHero = () => {
    return (
        <section
            className="relative bg-surface-container-low rounded-[2rem] p-8 md:p-16 overflow-hidden flex flex-col md:flex-row items-center gap-12"
        >
            {/* Decorative Background Elements */}
            <div
                className="absolute -top-24 -right-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl mix-blend-multiply"
            ></div>
            <div
                className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary-container/20 rounded-full blur-3xl mix-blend-multiply"
            ></div>
            
            <div className="flex-1 z-10 relative">
                <div
                    className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-full border border-outline-variant/20 mb-6 shadow-sm"
                >
                    <span className="material-symbols-outlined text-primary text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="font-label text-xs font-bold text-primary tracking-wide uppercase">Challenge</span>
                </div>
                <h1
                    className="text-5xl md:text-7xl font-extrabold font-headline text-on-surface leading-tight mb-6 tracking-tight"
                >
                    100 Days of <br /><span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-fill-transparent text-transparent">DevOps</span>
                </h1>
                <p className="text-lg text-on-surface-variant font-body max-w-xl mb-10 leading-relaxed">
                    Transform from a beginner to a robust DevOps engineer. Master Linux, networking, CI/CD, Docker,
                    Kubernetes, and Terraform through daily hands-on labs and real-world projects.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        className="px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-label font-bold text-sm tracking-wider uppercase hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        Enroll Now
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                    <button
                        className="px-8 py-4 bg-surface-container-highest text-primary rounded-xl font-label font-bold text-sm tracking-wider uppercase hover:bg-surface-variant transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add to My Path
                    </button>
                </div>
            </div>
            
            <div className="w-full md:w-1/3 z-10 hidden md:block">
                <div
                    className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 relative"
                >
                    <div
                        className="absolute -top-4 -right-4 w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center shadow-lg border-2 border-surface-container-lowest transform rotate-12"
                    >
                        <span className="material-symbols-outlined text-on-tertiary-fixed"
                            style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                    </div>
                    <h3 className="font-label text-sm uppercase tracking-wider text-on-surface-variant mb-4">Challenge
                        Stats</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                            <span className="font-body text-on-surface-variant flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm opacity-70">group</span>
                                Enrolled
                            </span>
                            <span className="font-label font-bold text-on-surface text-lg">12k+</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                            <span className="font-body text-on-surface-variant flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm opacity-70">calendar_today</span>
                                Duration
                            </span>
                            <span className="font-label font-bold text-on-surface text-lg">100 Days</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-body text-on-surface-variant flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm opacity-70">speed</span> 
                                Level
                            </span>
                            <span className="font-label font-bold text-on-surface text-lg">Advanced</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
