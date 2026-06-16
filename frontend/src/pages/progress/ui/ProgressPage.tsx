import { SideNavbar } from '@widgets/side-navbar';
import { Header } from '@widgets/header';
import { ProgressHero } from '@widgets/progress-hero';
import { ConsistencyStats } from '@widgets/consistency-stats';
import { ActivePathsProgress } from '@widgets/active-paths-progress';
import { DomainMastery } from '@widgets/domain-mastery';

export function ProgressPage() {
  return (
    <div className="flex bg-background min-h-screen font-body antialiased">
      <SideNavbar />
      
      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col bg-surface">
        <Header />
        
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-8">Progress Dashboard</h1>
            
            {/* Hero / Overview Section (Bento Grid Style) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <ProgressHero />
              <ConsistencyStats />
            </div>

            {/* Two Column Layout below Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ActivePathsProgress />
              <DomainMastery />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
