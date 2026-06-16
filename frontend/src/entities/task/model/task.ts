export type TaskType = 'Technical Lab' | 'Documentation' | 'Assessment' | 'Social';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  duration: string;
  isCompleted: boolean;
  isLocked?: boolean;
}
