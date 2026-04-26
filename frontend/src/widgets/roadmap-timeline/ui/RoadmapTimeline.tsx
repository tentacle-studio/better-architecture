import { cn } from '@shared/lib/utils';

interface TimelineItemProps {
    week: string;
    labs: number;
    title: string;
    description: string;
    index: number;
    active?: boolean;
}

const TimelineItem = ({ week, labs, title, description, index, active }: TimelineItemProps) => {
    return (
        <div
            className={cn(
                "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mb-8",
                !active && "opacity-80"
            )}
        >
            <div
                className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
                    active ? "bg-primary-container text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
                )}
            >
                <span className="font-label font-bold text-sm">{index}</span>
            </div>
            <div
                className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/10 md:group-odd:text-right"
            >
                <div className={cn("flex items-center justify-between md:group-odd:flex-row-reverse mb-2")}>
                    <span
                        className={cn(
                            "font-label text-xs font-bold tracking-wider uppercase",
                            active ? "text-primary" : "text-on-surface-variant"
                        )}
                    >
                        {week}
                    </span>
                    <span
                        className="text-xs text-on-surface-variant font-label bg-surface-container-high px-2 py-1 rounded"
                    >
                        {labs} Labs
                    </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface mb-2">{title}</h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

export const RoadmapTimeline = () => {
    const steps = [
        {
            week: "Week 1-2",
            labs: 14,
            title: "Linux Foundations & Scripting",
            description: "Master the command line, file systems, permissions, and bash scripting essentials to automate basic administrative tasks.",
            active: true
        },
        {
            week: "Week 3-4",
            labs: 10,
            title: "Networking & Security",
            description: "Deep dive into TCP/IP, DNS, load balancing, firewalls, and setting up secure VPCs in cloud environments.",
            active: false
        },
        {
            week: "Week 5-7",
            labs: 21,
            title: "Containers & Orchestration",
            description: "Dockerize applications, manage registries, and deploy scalable microservices using Kubernetes clusters.",
            active: false
        }
    ];

    return (
        <section>
            <h2 className="text-3xl font-extrabold font-headline text-on-surface mb-8 tracking-tight">The Journey</h2>
            <div
                className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-outline-variant/30 before:to-transparent"
            >
                {steps.map((step, idx) => (
                    <TimelineItem key={idx} index={idx + 1} {...step} />
                ))}
            </div>
            <div className="text-center mt-6">
                <button
                    className="text-primary font-label text-sm font-bold uppercase tracking-wider hover:text-primary-container transition-colors"
                >
                    View Full Syllabus ↓
                </button>
            </div>
        </section>
    );
};
