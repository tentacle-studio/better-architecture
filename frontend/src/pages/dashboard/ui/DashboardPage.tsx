import { SideNavbar } from '@widgets/side-navbar';
import { Header } from '@widgets/header';
import { Hero } from '@widgets/hero';
import { LearningPathsGrid } from '@widgets/learning-paths';
import { OngoingPathsList } from '@widgets/ongoing-paths';

export function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <SideNavbar />

      <main className="flex-1 md:ml-72 relative min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-violet-50/30">
        <Header />

        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
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