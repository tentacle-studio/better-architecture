import { useState, useEffect } from 'react';
import type { Task } from '@entities/task';
import { TaskCard } from '@entities/task';
import { httpClient } from '@shared/api';

export const DailyTasksList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    httpClient.get<Task[]>('/daily-tasks').then(({ data, error }) => {
      if (!error) setTasks(data);
    });
  }, []);

  const handleMarkDone = (id: string) => {
    httpClient.patch(`/daily-tasks/${id}`, { isCompleted: true }).then(({ error }) => {
      if (!error) {
        setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isCompleted: true } : t));
      }
    });
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStart={(id) => console.log('Starting task', id)}
          onMarkDone={handleMarkDone}
        />
      ))}
    </div>
  );
};
