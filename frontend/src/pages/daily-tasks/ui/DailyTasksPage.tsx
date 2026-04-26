import { SideNavbar } from '@widgets/side-navbar';
import { Header } from '@widgets/header';
import { DailyTasksList } from '@widgets/daily-tasks-list';
import { ProgressWidget } from '@widgets/progress-widget';
import { StreakWidget } from '@widgets/streak-widget';

export function DailyTasksPage() {
  return (
    <div className="flex bg-background min-h-screen font-body">
      <SideNavbar />
      
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header />
        
        <div className="flex-1 p-6 lg:p-10 bg-surface">
          <div className="max-w-6xl mx-auto flex flex-col xl:flex-row gap-8">
            {/* Left Column: Tasks */}
            <div className="flex-1 space-y-8">
              {/* Header Section */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-label text-sm text-primary tracking-wider uppercase bg-primary/10 px-2 py-1 rounded">
                    Daily Goal
                  </span>
                  <span className="text-on-surface-variant font-label text-sm">Week 6</span>
                </div>
                <h2 className="text-[3.5rem] leading-tight font-extrabold text-on-background font-headline tracking-tight">
                  Day 42
                </h2>
                <p className="text-xl text-on-surface-variant font-body mt-2 max-w-2xl">
                  Mastering Kubernetes Pods
                </p>
              </div>

              <DailyTasksList />
            </div>

            {/* Right Column: Widgets */}
            <aside className="w-full xl:w-80 flex flex-col gap-6">
              <ProgressWidget />
              <StreakWidget />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
