# gRPC Server - Streaming APIs

Real-time streaming capabilities for terminal access and resource monitoring.

## ExecStream - Terminal Access

Bidirectional streaming RPC for interactive terminal access to sandbox workloads.

### Features
- Real-time stdin/stdout/stderr
- Terminal resize support
- Automatic pod discovery
- TTY mode enabled

### Client Usage

```go
import (
    pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
)

// Create stream
stream, err := client.ExecStream(ctx)
if err != nil {
    log.Fatal(err)
}

// Send initial message with sandbox ID
err = stream.Send(&pb.ExecInput{
    SandboxId: "abc123",
})

// Send commands
err = stream.Send(&pb.ExecInput{
    Stdin: []byte("ls -la\n"),
})

// Receive output
for {
    output, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    
    if len(output.Stdout) > 0 {
        fmt.Print(string(output.Stdout))
    }
    if len(output.Stderr) > 0 {
        fmt.Fprint(os.Stderr, string(output.Stderr))
    }
}
```

### Terminal Resize

```go
// Send resize event
err = stream.Send(&pb.ExecInput{
    Resize: &pb.TerminalResize{
        Width:  120,
        Height: 40,
    },
})
```

### Implementation Details

**Pod Selection**:
- Searches for pods with label `app=workload`
- Selects first available pod
- Uses first container if multiple exist

**Shell**:
- Executes `/bin/sh` by default
- Runs in TTY mode for proper terminal emulation

**Error Handling**:
- Validates sandbox state before exec
- Returns error if no workload pods found
- Logs exec failures

## WatchResources - Resource Monitoring

Server-side streaming RPC for real-time Kubernetes resource updates.

### Features
- Multi-resource watching (Pods, Services, Deployments)
- Real-time event streaming
- Automatic status extraction
- Context-aware cancellation

### Client Usage

```go
// Start watching
stream, err := client.WatchResources(ctx, &pb.WatchResourcesRequest{
    SandboxId: "abc123",
})
if err != nil {
    log.Fatal(err)
}

// Receive events
for {
    event, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("[%s] %s/%s: %s\n",
        event.Kind,
        event.Namespace,
        event.Name,
        event.Status,
    )
}
```

### Watched Resources

| Resource   | Status Values                    |
|------------|----------------------------------|
| Pod        | Pending, Running, Succeeded, Failed, Unknown |
| Service    | Active                           |
| Deployment | Ready, Progressing               |

### Event Structure

```go
type ResourceEvent struct {
    Kind      string  // "Pod", "Service", "Deployment"
    Name      string  // Resource name
    Namespace string  // Sandbox namespace
    Status    string  // Current status
    JsonPatch string  // JSON patch (simplified)
}
```

### Implementation Details

**Watchers**:
- Creates separate watchers for each resource type
- Uses Kubernetes Watch API
- Multiplexes events through select statement

**Status Extraction**:
- **Pods**: `pod.Status.Phase`
- **Services**: Always "Active"
- **Deployments**: Compares ready vs total replicas

**Cleanup**:
- Watchers stopped on context cancellation
- Deferred cleanup ensures no leaks

## Stream Adapters

### StdinReader

Converts gRPC stream to `io.Reader` for Kubernetes exec.

```go
reader := NewStdinReader(stream)
defer reader.Close()

// Use as io.Reader
n, err := reader.Read(buffer)
```

**Features**:
- Buffers incoming data
- Thread-safe operations
- EOF handling

### StdoutWriter

Converts `io.Writer` to gRPC stream output.

```go
writer := NewStdoutWriter(stream)

// Use as io.Writer
n, err := writer.Write(data)
```

**Features**:
- Sends data to gRPC stream
- Thread-safe writes
- Data copying to prevent races

### StderrWriter

Separate stderr stream handling.

```go
writer := NewStderrWriter(stream)

// Use as io.Writer
n, err := writer.Write(errorData)
```

## Terminal Size Queue

Manages terminal resize events for exec sessions.

```go
queue := NewTerminalSizeQueue()
defer queue.Close()

// Queue resize event
queue.Resize(120, 40)

// Get next size (implements remotecommand.TerminalSizeQueue)
size := queue.Next()
fmt.Printf("Terminal: %dx%d\n", size.Width, size.Height)
```

**Features**:
- Buffered channel (size 10)
- Thread-safe operations
- Current size tracking
- Implements `remotecommand.TerminalSizeQueue`

## Error Handling

### Common Errors

**ExecStream**:
- `sandbox_id is required in first message` - Missing sandbox ID
- `sandbox is not ready` - Sandbox not in ready state
- `no workload pods found` - No pods with app=workload label
- `exec failed` - Kubernetes exec error

**WatchResources**:
- `failed to get sandbox` - Invalid sandbox ID
- `failed to create watcher` - Kubernetes API error
- `watch channel closed` - Watcher stopped unexpectedly

### Best Practices

1. **Always validate sandbox state** before operations
2. **Handle stream errors gracefully** with proper cleanup
3. **Use context cancellation** for timeout control
4. **Check for EOF** when receiving from streams
5. **Log errors** for debugging

## Testing

### Unit Tests

```bash
# Run all gRPC tests
go test ./internal/grpc/...

# Run with coverage
go test -cover ./internal/grpc/...

# Run with race detection
go test -race ./internal/grpc/...
```

### Manual Testing with grpcurl

```bash
# Test WatchResources
grpcurl -d '{"sandbox_id":"test"}' \
  localhost:50051 \
  orchestrator.Orchestrator/WatchResources

# Test other RPCs
grpcurl -d '{"user_id":"user1","quiz_id":"quiz1"}' \
  localhost:50051 \
  orchestrator.Orchestrator/CreateSandbox
```

## Performance Tips

1. **Buffer Size**: Terminal size queue has buffer of 10 events
2. **Data Copying**: Stream adapters copy data to prevent races
3. **Watcher Cleanup**: Always defer watcher.Stop()
4. **Context Usage**: Use context for timeout and cancellation

## Security Considerations

1. **Namespace Isolation**: All operations scoped to sandbox namespace
2. **Pod Selection**: Uses label selectors for security
3. **TTY Mode**: Proper terminal emulation
4. **Stream Validation**: Validates all inputs

## Troubleshooting

### ExecStream not working
- Check sandbox state is "ready"
- Verify workload pods exist with `app=workload` label
- Check pod is in Running state
- Verify container has `/bin/sh`

### WatchResources not sending events
- Verify sandbox namespace exists
- Check Kubernetes API connectivity
- Ensure resources exist in namespace
- Check context hasn't been cancelled

### Terminal resize not working
- Verify resize events are being sent
- Check terminal size queue is not full
- Ensure SPDY executor supports resize
