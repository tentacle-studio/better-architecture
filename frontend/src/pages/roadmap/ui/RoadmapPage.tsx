import { Header } from '@widgets/header';
import { SideNavbar } from '@widgets/side-navbar';
import { RoadmapHero } from '@widgets/roadmap-hero';
import { RoadmapTimeline } from '@widgets/roadmap-timeline';
import { RoadmapModules } from '@widgets/roadmap-modules';
import { RoadmapSidebar } from '@widgets/roadmap-sidebar';

export default function RoadmapPage() {
    return (
        <div className="antialiased min-h-screen flex flex-col md:flex-row bg-surface">
            {/* Desktop Side Navigation */}
            <SideNavbar />
            
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen flex flex-col">
                {/* Top Navigation (Desktop & Mobile) */}
                <Header />
                
                <div className="p-6 md:p-12 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-12">
                    {/* Hero Section */}
                    <RoadmapHero />
                    
                    {/* Main Layout Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Left Column (Roadmap & Curriculum) */}
                        <div className="lg:col-span-2 flex flex-col gap-12">
                            <RoadmapTimeline />
                            <RoadmapModules />
                        </div>
                        
                        {/* Right Column (Sidebar Widgets) */}
                        <RoadmapSidebar />
                    </div>
                    
                    {/* Footer spacer */}
                    <div className="h-12" />
                </div>
            </main>
        </div>
    );
}