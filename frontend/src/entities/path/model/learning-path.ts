export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  progress?: number;
  moduleInfo?: string;
  colorScheme: 'primary' | 'secondary' | 'tertiary';
}
