import { cn } from '@shared/lib/utils';

interface ModuleCardProps {
    title: string;
    description: string;
    lessons: number;
    progress: number;
    icon: string;
    iconColor: string;
}

const ModuleCard = ({ title, description, lessons, progress, icon, iconColor }: ModuleCardProps) => {
    return (
        <div
            className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group"
        >
            <div
                className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
            >
                <span className={cn("material-symbols-outlined text-6xl", iconColor)}>{icon}</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2 relative z-10">{title}</h3>
            <p className="font-body text-sm text-on-surface-variant mb-6 relative z-10">{description}</p>
            <div className="mt-auto relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-label text-xs text-on-surface-variant">Progress</span>
                    <span className="font-label text-xs font-bold text-primary">{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <span
                        className="material-symbols-outlined text-sm text-on-surface-variant"
                    >library_books</span>
                    <span className="font-label text-xs text-on-surface-variant">{lessons} Lessons</span>
                </div>
            </div>
        </div>
    );
};

export const RoadmapModules = () => {
    const modules = [
        {
            title: "CI/CD Pipelines",
            description: "Automate testing and deployment workflows using Jenkins, GitHub Actions, and GitLab CI.",
            lessons: 24,
            progress: 0,
            icon: "terminal",
            iconColor: "text-primary"
        },
        {
            title: "Docker & Kubernetes",
            description: "Containerize apps and orchestrate them at scale with K8s primitives and Helm charts.",
            lessons: 32,
            progress: 0,
            icon: "view_in_ar",
            iconColor: "text-secondary"
        },
        {
            title: "Infrastructure as Code",
            description: "Provision and manage cloud resources programmatically using Terraform and Ansible.",
            lessons: 28,
            progress: 0,
            icon: "account_tree",
            iconColor: "text-primary-container"
        },
        {
            title: "Monitoring & Logging",
            description: "Implement observability with Prometheus, Grafana, and the ELK stack for robust systems.",
            lessons: 16,
            progress: 0,
            icon: "monitoring",
            iconColor: "text-secondary-container"
        }
    ];

    return (
        <section>
            <div className="flex items-end justify-between mb-8">
                <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Core Modules</h2>
                <span className="font-label text-sm text-on-surface-variant">4 Major Pillars</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {modules.map((module, idx) => (
                    <ModuleCard key={idx} {...module} />
                ))}
            </div>
        </section>
    );
};
