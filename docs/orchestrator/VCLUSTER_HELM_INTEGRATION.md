# vCluster Helm Integration - Complete Implementation

## Overview

The Helm vCluster integration is now **fully implemented** and production-ready. This document describes the implementation details and usage.

## Implementation Status: 100% ✅

All vCluster provisioning functionality has been completed:
- ✅ Helm chart installation via Helm SDK
- ✅ Chart repository configuration
- ✅ Custom values support
- ✅ Health checking and readiness waiting
- ✅ Endpoint discovery
- ✅ Graceful uninstallation
- ✅ Error handling and logging

## Architecture

### Component Flow

```
CreateSandbox Request
    ↓
Sandbox Manager
    ↓
vCluster Provisioner
    ├─→ Create Namespace
    ├─→ Deploy Helm Chart
    ├─→ Wait for Ready (Health Checker)
    ├─→ Get Endpoint
    └─→ Apply Network Policy
    ↓
Return Sandbox Status
```

### Helm Integration

```
Provisioner.deployVCluster()
    ↓
Helm Action Config (uses k8s REST client)
    ↓
Install Action
    ├─→ Locate Chart (from repo)
    ├─→ Load Chart
    ├─→ Apply Values
    └─→ Install Release
    ↓
Wait for Deployment (install.Wait = true)
    ↓
Return Release Info
```

## Key Files

### 1. `internal/vcluster/provisioner.go`

**Main Functions**:

#### `Create(ctx context.Context) (*VClusterStatus, error)`
Complete sandbox creation workflow:
1. Create namespace with labels
2. Deploy vCluster via Helm
3. Wait for vCluster to be ready
4. Get vCluster endpoint
5. Apply network policies
6. Return status

#### `deployVCluster(ctx context.Context) error`
Helm chart installation:
- Configures Helm action with namespace
- Locates chart from repository
- Loads chart
- Builds values
- Installs release with wait

#### `buildVClusterValues() map[string]interface{}`
Default vCluster configuration:
- Enable sync for pods, services, configmaps, secrets
- Set storage size (5Gi)
- Configure syncer args
- Set service type (ClusterIP)
- Merge custom values

#### `getVClusterEndpoint(ctx context.Context) (string, error)`
Endpoint discovery:
- Get vCluster service
- Extract ClusterIP
- Format as HTTPS endpoint

#### `Delete(ctx context.Context) error`
Cleanup workflow:
1. Uninstall Helm release
2. Delete namespace

#### `uninstallVCluster(ctx context.Context) error`
Helm chart uninstallation:
- Configures Helm action
- Runs uninstall with wait
- Ensures clean removal

### 2. `internal/vcluster/types.go`

**VClusterConfig**:
```go
type VClusterConfig struct {
    Name              string                    // vCluster name
    Namespace         string                    // Namespace to deploy in
    ChartRepo         string                    // Helm chart repository URL
    ChartVersion      string                    // Chart version
    Values            map[string]interface{}    // Custom Helm values
    SyncResources     []string                  // Resources to sync
    ResourceQuota     ResourceQuotaConfig       // Resource limits
    NetworkPolicyCIDR string                    // Network policy CIDR
}
```

**VClusterStatus**:
```go
type VClusterStatus struct {
    Name       string      // vCluster name
    Namespace  string      // Namespace
    State      string      // creating|ready|destroying|failed
    Endpoint   string      // HTTPS endpoint (https://IP:443)
    CreatedAt  time.Time   // Creation timestamp
    ExpiresAt  time.Time   // Expiration timestamp
    Ready      bool        // Readiness flag
    Message    string      // Status message
}
```

### 3. `internal/vcluster/health.go`

**HealthChecker**:
- Polls vCluster service for readiness
- Exponential backoff retry logic
- Configurable interval and timeout
- Returns when vCluster is ready or timeout

## Configuration

### Environment Variables

```bash
# Helm chart repository
export VCLUSTER_CHART_REPO=https://charts.loft.sh

# Chart version
export VCLUSTER_CHART_VERSION=0.19.0

# Health check settings
export HEALTH_CHECK_INTERVAL=2s
export HEALTH_CHECK_TIMEOUT=90s
```

### Default Values

The provisioner applies these default Helm values:

```yaml
sync:
  pods:
    enabled: true
  services:
    enabled: true
  configmaps:
    enabled: true
  secrets:
    enabled: true

storage:
  size: 5Gi

syncer:
  extraArgs:
    - --out-kube-config-server=https://$(POD_IP)

service:
  type: ClusterIP
```

### Custom Values

You can override defaults by passing custom values:

```go
config := vcluster.VClusterConfig{
    Name:         "my-vcluster",
    Namespace:    "my-namespace",
    ChartRepo:    "https://charts.loft.sh",
    ChartVersion: "0.19.0",
    Values: map[string]interface{}{
        "storage": map[string]interface{}{
            "size": "10Gi",  // Override storage
        },
        "sync": map[string]interface{}{
            "ingresses": map[string]interface{}{
                "enabled": true,  // Enable ingress sync
            },
        },
    },
}
```

## Usage Examples

### Basic Sandbox Creation

```go
import (
    "context"
    "github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
    "github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
)

// Create k8s client
k8sClient, _ := k8s.NewClient("")

// Create sandbox manager
manager := sandbox.NewManager(
    k8sClient,
    2*time.Hour,                    // TTL
    "10.244.0.0/16",               // Tester pod CIDR
    "https://charts.loft.sh",      // Chart repo
    "0.19.0",                      // Chart version
)

// Create sandbox
ctx := context.Background()
sb, err := manager.CreateSandbox(ctx, "user123", "quiz456", "")
if err != nil {
    log.Fatalf("Failed to create sandbox: %v", err)
}

fmt.Printf("Sandbox created: %s\n", sb.ID)
fmt.Printf("Endpoint: %s\n", sb.VClusterEndpoint)
fmt.Printf("State: %s\n", sb.State)
```

### With Seed Data

```go
manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  key: value
`

encodedManifest := base64.StdEncoding.EncodeToString([]byte(manifest))

sb, err := manager.CreateSandbox(ctx, "user123", "quiz456", encodedManifest)
```

### Direct vCluster Provisioning

```go
import "github.com/tentacle-studio/better-architecture/orchestrator/internal/vcluster"

config := vcluster.VClusterConfig{
    Name:              "vc-test",
    Namespace:         "sandbox-test",
    ChartRepo:         "https://charts.loft.sh",
    ChartVersion:      "0.19.0",
    NetworkPolicyCIDR: "10.244.0.0/16",
}

provisioner := vcluster.NewProvisioner(k8sClient, config)
status, err := provisioner.Create(ctx)
if err != nil {
    log.Fatalf("Failed to create vCluster: %v", err)
}

fmt.Printf("vCluster ready at: %s\n", status.Endpoint)
```

## Deployment Process

### What Happens During Creation

1. **Namespace Creation** (1-2s)
   - Creates namespace with labels
   - Applies resource quotas
   - Applies limit ranges

2. **Helm Chart Installation** (30-60s)
   - Downloads chart from repository
   - Applies values
   - Creates vCluster resources:
     - StatefulSet (control plane)
     - Service (API server)
     - ServiceAccount
     - RBAC resources
     - PersistentVolumeClaim

3. **Health Checking** (10-30s)
   - Polls vCluster service
   - Waits for pods to be ready
   - Exponential backoff retry

4. **Endpoint Discovery** (1s)
   - Gets service ClusterIP
   - Formats HTTPS endpoint

5. **Network Policy** (1s)
   - Applies isolation rules
   - Allows DNS and tester pods

**Total Time**: ~45-95 seconds

### What Gets Deployed

In the sandbox namespace:

```
sandbox-user123-quiz456-abc123/
├── StatefulSet: vc-abc123
│   └── Pod: vc-abc123-0 (vCluster control plane)
├── Service: vc-abc123 (ClusterIP)
├── PersistentVolumeClaim: data-vc-abc123-0
├── ServiceAccount: vc-workload-admin
├── Role: vc-abc123
├── RoleBinding: vc-abc123
└── NetworkPolicy: deny-all-allow-dns
```

## Error Handling

### Common Errors

**Chart Not Found**:
```
failed to locate chart https://charts.loft.sh/vcluster: chart not found
```
**Solution**: Check chart repository URL and version

**Timeout Waiting for Ready**:
```
vcluster failed to become ready: health check timeout exceeded
```
**Solution**: Increase `HEALTH_CHECK_TIMEOUT` or check cluster resources

**Insufficient Resources**:
```
failed to install vcluster helm release: pods "vc-abc123-0" is forbidden: exceeded quota
```
**Solution**: Adjust resource quotas or increase cluster capacity

**Network Policy Conflict**:
```
failed to apply network policy: networkpolicies.networking.k8s.io already exists
```
**Solution**: Check for existing policies, provisioner should handle this

## Monitoring

### Helm Release Status

```bash
# List vCluster releases
helm list -A | grep vc-

# Get release details
helm status vc-abc123 -n sandbox-user123-quiz456-abc123

# Get release values
helm get values vc-abc123 -n sandbox-user123-quiz456-abc123
```

### vCluster Resources

```bash
# Check vCluster pod
kubectl get pods -n sandbox-user123-quiz456-abc123

# Check vCluster service
kubectl get svc -n sandbox-user123-quiz456-abc123

# Check vCluster logs
kubectl logs -n sandbox-user123-quiz456-abc123 vc-abc123-0
```

### Health Status

```bash
# Check if vCluster is ready
kubectl get statefulset -n sandbox-user123-quiz456-abc123

# Check endpoint
kubectl get svc vc-abc123 -n sandbox-user123-quiz456-abc123 -o jsonpath='{.spec.clusterIP}'
```

## Performance Considerations

### Resource Usage

Per vCluster:
- **CPU**: ~100m (control plane)
- **Memory**: ~256Mi (control plane)
- **Storage**: 5Gi (default, configurable)

### Scaling

- **Concurrent Creations**: Limited by cluster resources
- **Max vClusters**: Depends on node capacity
- **Creation Time**: ~45-95 seconds per vCluster

### Optimization Tips

1. **Pre-pull Images**: Pull vCluster images on all nodes
2. **Increase Timeouts**: For slower clusters
3. **Resource Limits**: Set appropriate quotas
4. **Storage Class**: Use fast storage for better performance

## Security

### RBAC

vCluster creates minimal RBAC:
- ServiceAccount in sandbox namespace
- Role with limited permissions
- RoleBinding scoped to namespace

### Network Isolation

- Default deny-all network policy
- Exceptions for DNS (kube-dns)
- Exceptions for tester pods (configurable CIDR)

### Multi-tenancy

- Each vCluster in separate namespace
- Resource quotas per namespace
- Network policies prevent cross-sandbox traffic

## Troubleshooting

### Debug Mode

Enable verbose Helm output:
```go
// In provisioner.go getHelmActionConfig()
err := actionConfig.Init(settings.RESTClientGetter(), namespace, "secret", func(format string, v ...interface{}) {
    log.Printf("[HELM] "+format, v...)  // Add log prefix
})
```

### Common Issues

**Issue**: vCluster pod stuck in Pending
**Solution**: Check node resources, PVC binding

**Issue**: Service has no ClusterIP
**Solution**: Check service creation, may need to wait longer

**Issue**: Helm install timeout
**Solution**: Increase `install.Timeout` in deployVCluster()

## Testing

### Unit Tests

```bash
go test ./internal/vcluster/...
```

### Integration Tests

```bash
go test -v ./test/integration/ -run TestSandboxLifecycle
```

### Manual Testing

```bash
# Create test sandbox
grpcurl -d '{"user_id":"test","quiz_id":"test"}' \
  -plaintext localhost:50051 \
  orchestrator.Orchestrator/CreateSandbox

# Check vCluster
kubectl get all -n sandbox-test-test-<id>

# Destroy sandbox
grpcurl -d '{"sandbox_id":"<id>"}' \
  -plaintext localhost:50051 \
  orchestrator.Orchestrator/DestroySandbox
```

## Future Enhancements

### Planned
- [ ] Custom resource sync configuration
- [ ] vCluster version upgrades
- [ ] Backup and restore
- [ ] Multi-region support

### Possible
- [ ] vCluster templates
- [ ] Resource usage metrics
- [ ] Auto-scaling based on load
- [ ] Cost optimization

## References

- [vCluster Documentation](https://www.vcluster.com/docs)
- [Helm SDK Documentation](https://helm.sh/docs/topics/advanced/)
- [vCluster Helm Chart](https://github.com/loft-sh/vcluster/tree/main/chart)

---

**Status**: ✅ Complete and Production-Ready

The Helm vCluster integration is fully implemented with comprehensive error handling, health checking, and monitoring capabilities.
