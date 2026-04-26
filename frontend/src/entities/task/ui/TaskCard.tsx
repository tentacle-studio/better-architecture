import type { Task } from '../model/task';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/ui/button';

interface TaskCardProps {
  task: Task;
  onStart?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  className?: string;
}

export const TaskCard = ({ task, onStart, onMarkDone, className }: TaskCardProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Technical Lab': return 'terminal';
      case 'Documentation': return 'menu_book';
      case 'Assessment': return 'quiz';
      case 'Social': return 'forum';
      default: return 'task';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Technical Lab': return 'text-primary';
      case 'Documentation': return 'text-on-surface-variant';
      case 'Assessment': return 'text-secondary';
      case 'Social': return 'text-tertiary';
      default: return 'text-primary';
    }
  };

  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-xl p-5 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow duration-300 border border-outline-variant/20",
        task.isCompleted && "opacity-70 hover:opacity-100",
        className
      )}
    >
      {task.type === 'Technical Lab' && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary-container" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-2">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 mt-1 sm:mt-0",
              getTypeColor(task.type)
            )}
          >
            <span 
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {getIcon(task.type)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("font-label text-xs font-bold uppercase tracking-widest", getTypeColor(task.type))}>
                {task.type}
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span className="font-label text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span> {task.duration}
              </span>
            </div>
            <h3 className="text-lg font-bold font-headline text-on-background">{task.title}</h3>
            <p className="text-sm text-on-surface-variant font-body mt-1">{task.description}</p>
          </div>
        </div>
        
        {task.isCompleted ? (
           <Button
            variant="ghost"
            className="shrink-0 bg-surface-container-highest text-on-background px-6 py-2.5 rounded-lg font-headline font-semibold hover:bg-surface-dim transition-colors self-start sm:self-center flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">check</span> Done
          </Button>
        ) : (
          task.type === 'Technical Lab' ? (
            <Button
              onClick={() => onStart?.(task.id)}
              className="shrink-0 bg-primary text-on-primary px-6 py-2.5 rounded-lg font-headline font-semibold hover:bg-primary-container transition-colors self-start sm:self-center shadow-sm"
            >
              Start Lab
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onMarkDone?.(task.id)}
              className="shrink-0 bg-surface-container-highest text-on-background px-6 py-2.5 rounded-lg font-headline font-semibold hover:bg-surface-dim transition-colors self-start sm:self-center flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">check</span> Mark Done
            </Button>
          )
        )}
      </div>
    </div>
  );
};
