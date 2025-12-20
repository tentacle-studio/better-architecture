export enum ServiceType {
  WAF = 'WAF',
  SQS = 'SQS',
  ALB = 'ALB',
  COMPUTE = 'COMPUTE',
  CACHE = 'CACHE',
  DATABASE = 'DATABASE',
  S3 = 'S3',
}

export enum TrafficType {
  STATIC = 'STATIC',
  READ = 'READ',
  WRITE = 'WRITE',
  UPLOAD = 'UPLOAD',
  SEARCH = 'SEARCH',
  MALICIOUS = 'MALICIOUS'
}

export enum GameMode {
  SURVIVAL = 'SURVIVAL',
  SANDBOX = 'SANDBOX'
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface InfrastructureService {
  id: string;
  type: ServiceType;
  tier: number;
  health: number;
  currentLoad: number;
  position: Position;
  capacity: number;  // Add this if missing
  connectedToIds: string[];
  createdAt: number;
  connections: string[];
}

export interface TrafficRequest {
  id: string;
  type: TrafficType;
  spawnTime: number;
  path: string[];  // Ensure this exists
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
  failureReason?: string;
}

export interface EconomyStats {
  incomeBySource: Record<string, number>;
  incomeCountBySource: Record<string, number>;
  expensesByCategory: Record<string, number>;
  expenseCountByCategory: Record<string, number>;
  totalRequestsProcessed: number;
  totalRequestsFailed: number;
  totalMaliciousBlocked: number;
  totalMaliciousPassed: number;
}

export interface GameEconomy {
  totalRevenue: number;
  totalExpenses: number;
  revenuePerMinute: number;
  expensesPerMinute: number;
}

export interface GameEvent {
  eventType: string;
  description: string;
  startTime: number;
  duration: number;
  endTime: number;
}

export interface GameState {
  gameId: string;
  mode: string;
  paused: boolean;
  gameOver: boolean;
  autoRepairEnabled: boolean;
  startTime: number;
  reputation: number;
  budget: number;
  rpsMultiplier: number;
  elapsedTime: number;
  services: Record<string, InfrastructureService>;
  activeEvents: GameEvent[];
  trafficMix: Record<string, number>;
  economy: GameEconomy;
}

export interface ServiceTypeInfo {
  displayName: string;
  cost: number;
  baseCapacity: number;
  upkeepPerMinute: number;
  description: string;
  color: string;
}

export const SERVICE_INFO: Record<ServiceType, ServiceTypeInfo> = {
  [ServiceType.WAF]: {
    displayName: 'WAF',
    cost: 40,
    baseCapacity: 30,
    upkeepPerMinute: 2.0,
    description: 'Firewall - Blocks malicious traffic',
    color: '#ef4444'
  },
  [ServiceType.SQS]: {
    displayName: 'SQS',
    cost: 35,
    baseCapacity: 200,
    upkeepPerMinute: 1.5,
    description: 'Queue - Buffers requests during spikes',
    color: '#f59e0b'
  },
  [ServiceType.ALB]: {
    displayName: 'ALB',
    cost: 50,
    baseCapacity: 20,
    upkeepPerMinute: 3.0,
    description: 'Load Balancer - Distributes traffic',
    color: '#8b5cf6'
  },
  [ServiceType.COMPUTE]: {
    displayName: 'Compute',
    cost: 60,
    baseCapacity: 4,
    upkeepPerMinute: 4.0,
    description: 'EC2 Instance - Processes requests',
    color: '#3b82f6'
  },
  [ServiceType.CACHE]: {
    displayName: 'Cache',
    cost: 60,
    baseCapacity: 30,
    upkeepPerMinute: 3.0,
    description: 'Redis Cache - Caches responses',
    color: '#10b981'
  },
  [ServiceType.DATABASE]: {
    displayName: 'Database',
    cost: 150,
    baseCapacity: 8,
    upkeepPerMinute: 8.0,
    description: 'RDS - Persistent data storage',
    color: '#06b6d4'
  },
  [ServiceType.S3]: {
    displayName: 'S3',
    cost: 25,
    baseCapacity: 25,
    upkeepPerMinute: 1.5,
    description: 'Storage - Static files and uploads',
    color: '#f97316'
  }
};

export const TRAFFIC_INFO = {
  [TrafficType.STATIC]: { color: '#4ade80', name: 'Static' },
  [TrafficType.READ]: { color: '#60a5fa', name: 'Read' },
  [TrafficType.WRITE]: { color: '#fb923c', name: 'Write' },
  [TrafficType.UPLOAD]: { color: '#facc15', name: 'Upload' },
  [TrafficType.SEARCH]: { color: '#22d3ee', name: 'Search' },
  [TrafficType.MALICIOUS]: { color: '#ef4444', name: 'Malicious' }
};
