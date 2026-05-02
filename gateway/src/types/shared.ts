export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  level: number;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lab {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  xpReward: number;
  quizSpec: QuizSpec;
  createdAt: Date;
}

export interface QuizSpec {
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'code-check' | 'resource-check';
  question: string;
  options?: string[];
  correctAnswer?: string;
  validationScript?: string;
}

export interface Progress {
  userId: string;
  level: number;
  xp: number;
  streak: number;
  paths: PathProgress[];
  domains: DomainProgress[];
}

export interface PathProgress {
  pathId: string;
  pathName: string;
  completedModules: number;
  totalModules: number;
  progress: number;
}

export interface DomainProgress {
  domain: string;
  level: number;
  labsCompleted: number;
}

export interface DailyTask {
  id: string;
  userId: string;
  day: string;
  week: number;
  topic: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  isCompleted: boolean;
  type: 'lab' | 'quiz' | 'reading';
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface SandboxSession {
  sandboxId: string;
  userId: string;
  labId: string;
  wsTerminalUrl: string;
  wsCanvasUrl: string;
  wsTrafficUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ResourceEvent {
  type: 'resource_event';
  data: {
    kind: string;
    name: string;
    status: string;
    connections?: Connection[];
  };
}

export interface Connection {
  from: string;
  to: string;
  port: number;
}

export interface RawTrafficEvent {
  ts: number;
  src_pod: string;
  dst_pod: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: 'TCP' | 'UDP' | 'HTTP';
  bytes: number;
  latency_ns: number;
}

export interface TrafficEvent {
  src: string;
  dst: string;
  protocol: string;
  latency_ms: number;
  bytes?: number;
}

export interface TrafficMessage {
  type: 'traffic';
  events: TrafficEvent[];
}
