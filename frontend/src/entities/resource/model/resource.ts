export type ResourceKind = 'Pod' | 'Service' | 'Deployment'

export type ResourceStatus =
  | 'Running'
  | 'Pending'
  | 'Failed'
  | 'Succeeded'
  | 'Unknown'
  | 'Ready'
  | 'Progressing'
  | 'Active'
  | 'Available'
  | 'Progressing'

export type ResourceType = 'Pod' | 'Service' | 'Deployment'

export interface Resource {
  kind: ResourceType
  name: string
  namespace: string
  status: ResourceStatus
  eventType?: 'Added' | 'Modified' | 'Deleted' | 'Initial'
  // Pod-specific fields
  readyContainers?: number
  totalContainers?: number
  restartCount?: number
  conditions?: string[]
}

export interface ResourceState {
  resources: Resource[]
  isLoading: boolean
  error: string | null
}