import { Spinner } from '@shared/ui/spinner'
import { Alert, AlertDescription } from '@shared/ui/alert'
import { ResourceItem } from './ResourceItem'
import type { Resource } from '../model/resource'

interface ResourceListProps {
  resources: Resource[]
  isLoading?: boolean
  error?: string | null
  filterByKind?: Resource['kind'][]
}

export function ResourceList({
  resources,
  isLoading = false,
  error = null,
  filterByKind,
}: ResourceListProps) {
  const filteredResources = filterByKind
    ? resources.filter((r) => filterByKind.includes(r.kind))
    : resources

  const pods = filteredResources.filter((r) => r.kind === 'Pod')
  const services = filteredResources.filter((r) => r.kind === 'Service')
  const deployments = filteredResources.filter((r) => r.kind === 'Deployment')

  if (isLoading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-sm text-gray-500">Loading resources...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (filteredResources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No resources found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Pods</h3>
          <div className="space-y-1.5">
            {pods.map((resource) => (
              <ResourceItem key={`${resource.kind}-${resource.name}`} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Services</h3>
          <div className="space-y-1.5">
            {services.map((resource) => (
              <ResourceItem key={`${resource.kind}-${resource.name}`} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {deployments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Deployments</h3>
          <div className="space-y-1.5">
            {deployments.map((resource) => (
              <ResourceItem key={`${resource.kind}-${resource.name}`} resource={resource} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}