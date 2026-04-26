import type { Task } from '@entities/task';
import { TaskCard } from '@entities/task';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Lab: Deploying a Multi-container Pod',
    description: 'Configure and deploy a sidecar container alongside a main application pod.',
    type: 'Technical Lab',
    duration: '45 mins',
    isCompleted: false,
  },
  {
    id: '2',
    title: 'Reading: The Pod Lifecycle',
    description: 'Understand the phases a Pod goes through from Pending to Succeeded.',
    type: 'Documentation',
    duration: '20 mins',
    isCompleted: true,
  },
  {
    id: '3',
    title: 'Quiz: Pod Networking Basics',
    description: '',
    type: 'Assessment',
    duration: '15 mins',
    isCompleted: false,
  },
  {
    id: '4',
    title: 'Community: Share your lab result',
    description: '',
    type: 'Social',
    duration: '5 mins',
    isCompleted: false,
  },
];

export const DailyTasksList = () => {
  return (
    <div className="space-y-4">
      {MOCK_TASKS.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStart={(id) => console.log('Starting task', id)}
          onMarkDone={(id) => console.log('Marking task done', id)}
        />
      ))}
    </div>
  );
};
