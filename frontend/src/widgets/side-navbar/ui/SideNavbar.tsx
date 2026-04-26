import { UserAvatar } from '@entities/user';
import { cn } from '@shared/lib/utils';
import { Link, useLocation } from 'react-router-dom';

export const SideNavbar = () => {
    const location = useLocation();

    const menuItems = [
        { label: 'Dashboard', icon: 'dashboard', href: '/' },
        { label: 'Curriculum', icon: 'auto_stories', href: '/roadmap' },
        { label: 'Daily Tasks', icon: 'event_upcoming', href: '/daily-tasks' },
        { label: 'Progress', icon: 'query_stats', href: '/progress' },
        { label: 'Certificates', icon: 'verified', href: '/certificates' },
    ];

    return (
        <nav className="bg-surface-container-low text-indigo-700 font-body hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 py-8 z-40 transition-colors shadow-sm border-r border-indigo-100">
            <div className="px-8 mb-8">
                <UserAvatar
                    name="The Scholar"
                    level="Level 12 Architect"
                    avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDZd3YVx9uJWiJKOOvDVMuLPlNNz6WJOT1rqjXR6cZAatm16vejUKt0MXQvawk8nq-QHkC1uc6cUQN9t27SkgM9Pv4frkM0p3AUYoTKkcObz5o6W4k1ol-xq3St6gafAV6eVcHlJLzX0MEP3SfMXJ2YJEZmAYGrMw0T7eNIEOELbleHIpIlaCXUICV2bVOT7-441BiQcGBWTdo7fwrHDD4sAmPI2qf4eMvtjYTOGKAi14gvHWgfqLk-IjPlaCY8RgBCVYQKpa-q7l4"
                />
            </div>

            <div className="px-8 mb-8">
                <button className="w-full bg-primary text-on-primary font-headline font-medium py-3 px-4 rounded-lg hover:bg-primary-container transition-colors shadow-sm active:scale-95 duration-200">
                    Start Daily Lab
                </button>
            </div>

            <ul className="flex flex-col flex-grow gap-2">
                {menuItems.map((item) => {
                    const active = location.pathname === item.href;
                    return (
                        <li key={item.label}>
                            <Link
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-4 py-3 font-label text-[10px] tracking-widest uppercase transition-all duration-300",
                                    active
                                        ? "bg-white text-indigo-700 rounded-l-full ml-4 pl-4 shadow-[0_4px_12px_rgb(67,56,202,0.1)] border-l-4 border-indigo-600"
                                        : "px-8 text-slate-500 hover:text-indigo-600 hover:bg-white/50"
                                )}
                            >
                                <span
                                    className="material-symbols-outlined text-lg"
                                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-auto flex flex-col gap-2">
                <Link to="/help" className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-indigo-600 hover:bg-white/50 transition-all font-label text-[10px] tracking-widest uppercase">
                    <span className="material-symbols-outlined text-lg">help</span>
                    Help Center
                </Link>
                <Link to="/logout" className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-indigo-600 hover:bg-white/50 transition-all font-label text-[10px] tracking-widest uppercase">
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Logout
                </Link>
            </div>
        </nav>
    );
};
