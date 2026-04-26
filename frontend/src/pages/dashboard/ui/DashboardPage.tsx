import { SideNavbar } from '@widgets/side-navbar';
import { Header } from '@widgets/header';
import { Hero } from '@widgets/hero';
import { LearningPathsGrid } from '@widgets/learning-paths';
import { OngoingPathsList } from '@widgets/ongoing-paths';

export function DashboardPage() {
  return (
    <div className="flex bg-background min-h-screen font-body">
      <SideNavbar />
      
      <main className="flex-1 md:ml-64 relative min-h-screen">
        <Header />
        
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
          <Hero />
          
          <div className="flex flex-col lg:flex-row gap-10">
            <LearningPathsGrid />
            <OngoingPathsList />
          </div>
        </div>
      </main>
    </div>
  );
}