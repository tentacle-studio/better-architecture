import type { WorkflowNode, WorkflowEdge } from "./workflow"

interface K8sResource {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    labels?: Record<string, string>
  }
  spec?: {
    selector?: {
      matchLabels?: Record<string, string>
    }
    ports?: Array<{ port: number; targetPort?: number }>
  }
  data?: Record<string, string>
}

interface InfrastructureComponent {
  name: string
  type: string
  icon: string
  accentColor: number
  ports?: number[]
  purpose?: string
}

const INFRASTRUCTURE_MAPPING: Record<string, InfrastructureComponent> = {
  postgres: {
    name: "PostgreSQL",
    type: "database",
    icon: "🐘",
    accentColor: 0x336791,
    ports: [5432],
    purpose: "Relational Database",
  },
  redis: {
    name: "Redis",
    type: "cache",
    icon: "⚡",
    accentColor: 0xdc382d,
    ports: [6379],
    purpose: "In-Memory Cache",
  },
  nats: {
    name: "NATS",
    type: "messaging",
    icon: "📨",
    accentColor: 0x27aae1,
    ports: [4222],
    purpose: "Message Bus",
  },
  kafka: {
    name: "Kafka",
    type: "messaging",
    icon: "🔄",
    accentColor: 0x231f20,
    ports: [9092],
    purpose: "Event Streaming",
  },
  mongodb: {
    name: "MongoDB",
    type: "database",
    icon: "🍃",
    accentColor: 0x47a248,
    ports: [27017],
    purpose: "Document Database",
  },
  elasticsearch: {
    name: "Elasticsearch",
    type: "search",
    icon: "🔍",
    accentColor: 0x005571,
    ports: [9200],
    purpose: "Search Engine",
  },
}

function parseYAML(yamlContent: string): K8sResource[] {
  const resources: K8sResource[] = []
  const docs = yamlContent.split(/^---$/m)

  for (const doc of docs) {
    const trimmed = doc.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    try {
      const resource = parseSimpleYAML(trimmed) as unknown
      const typed = resource as K8sResource
      if (typed && typed.kind && typed.metadata?.name) {
        resources.push(typed)
      }
    } catch (err) {
      console.warn("Failed to parse YAML document:", err)
    }
  }

  return resources
}

function parseSimpleYAML(yaml: string): Record<string, unknown> {
  const lines = yaml.split("\n")
  const result: Record<string, unknown> = {}
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }]

  for (let line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    if (trimmed.includes("|")) {
      const key = trimmed.split(":")[0].trim()
      const parent = stack[stack.length - 1].obj
      parent[key] = ""
      continue
    }

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }

    if (trimmed.startsWith("- ")) {
      const parent = stack[stack.length - 1].obj
      const lastKey = Object.keys(parent).pop()
      if (lastKey) {
        if (!Array.isArray(parent[lastKey])) {
          parent[lastKey] = []
        }
        const item = trimmed.slice(2).trim()
        if (item.includes(":")) {
          const [k, v] = item.split(":")
          const obj = { [k.trim()]: v.trim() }
          ;(parent[lastKey] as unknown[]).push(obj)
          stack.push({ obj, indent })
        } else {
          ;(parent[lastKey] as unknown[]).push(item)
        }
      }
    } else if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":")
      const key = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()

      const parent = stack[stack.length - 1].obj
      if (value) {
        parent[key] = value.replace(/^["']|["']$/g, "")
      } else {
        const newObj: Record<string, unknown> = {}
        parent[key] = newObj
        stack.push({ obj: newObj, indent })
      }
    }
  }

  return result
}

export function parseInfrastructure(seedManifest: string): {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
} {
  if (!seedManifest || seedManifest.trim().length === 0) {
    console.warn('[Infrastructure Parser] Empty seed manifest')
    return { nodes: [], edges: [] }
  }

  try {
    const resources = parseYAML(seedManifest)
    console.log('[Infrastructure Parser] Total resources parsed:', resources.length)
    console.log('[Infrastructure Parser] Resource kinds:', resources.map(r => r.kind))

    const nodes: WorkflowNode[] = []
    const edges: WorkflowEdge[] = []

    const deployments = resources.filter((r) => r.kind === "Deployment")
    const services = resources.filter((r) => r.kind === "Service")

    console.log('[Infrastructure Parser] Deployments found:', deployments.length)
    console.log('[Infrastructure Parser] Deployment names:', deployments.map(d => d.metadata?.name))

  let xOffset = 120
  const yCenter = 300
  const spacing = 280

  for (const deployment of deployments) {
    const componentName = deployment.metadata?.name?.toLowerCase() || ""
    console.log('[Infrastructure Parser] Checking deployment:', componentName)
    const infraConfig = INFRASTRUCTURE_MAPPING[componentName]
    console.log('[Infrastructure Parser] Config found:', !!infraConfig)

    if (infraConfig) {
      const service = services.find((s) => s.metadata.name === componentName)
      const ports = service?.spec?.ports?.map((p) => p.port) || infraConfig.ports || []

      nodes.push({
        id: `infra-${componentName}`,
        type: "tool",
        label: infraConfig.name,
        sublabel: infraConfig.purpose,
        x: xOffset,
        y: yCenter,
        color: 0x1e293b,
        accentColor: infraConfig.accentColor,
        icon: infraConfig.icon,
        inputs: [{ id: `${componentName}-in`, label: "Connect" }],
        outputs: [
          { id: `${componentName}-out`, label: `Port ${ports[0] || ""}` },
        ],
        selected: false,
      })

      xOffset += spacing
    }
  }

    if (nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge-${i}`,
          sourceNodeId: nodes[i].id,
          sourcePortId: nodes[i].outputs[0].id,
          targetNodeId: nodes[i + 1].id,
          targetPortId: nodes[i + 1].inputs[0].id,
        })
      }
    }

    console.log('[Infrastructure Parser] Successfully parsed:', nodes.length, 'nodes')
    return { nodes, edges }
  } catch (error) {
    console.error('[Infrastructure Parser] Failed to parse manifest:', error)
    return { nodes: [], edges: [] }
  }
}
