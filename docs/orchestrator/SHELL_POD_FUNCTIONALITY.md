# Shell Pod Functionality Explanation

The shell pod provides interactive terminal access to the sandbox environment. It's a clever workaround for environments where direct kubectl exec doesn't work (like OrbStack/local k3d where the kubelet is unreachable).

## Overview

Purpose: Provide users with a command-line interface to interact with their lab environment inside the vcluster.
Image: alpine/socat:latest (Alpine Linux with socat utility)

## Architecture

┌─────────────────────────────────────────────────────────────────┐
│  Gateway (WebSocket/gRPC Client)                                │
│  ├─ User's browser/terminal                                     │
│  └─ Sends keystrokes/commands                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │ gRPC Bidirectional Stream
                     │ (ExecInput/ExecOutput messages)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Orchestrator gRPC Server                                       │
│  ├─ ExecStream() method                                         │
│  ├─ Creates kubectl port-forward process                        │
│  └─ Routes stdin/stdout between gRPC stream and TCP connection  │
└────────────────────┬────────────────────────────────────────────┘
                     │ kubectl port-forward
                     │ localhost:random_port → shell:8080
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  VCluster (Virtual Kubernetes Cluster)                          │
│  └─ default namespace                                           │
│     ├─ Shell Pod (alpine/socat)                                 │
│     │  ├─ Listens on TCP port 8080                              │
│     │  └─ socat: TCP-LISTEN:8080 → EXEC:/bin/sh                 │
│     ├─ Postgres Pod                                             │
│     ├─ Redis Pod                                                │
│     └─ User's deployed services                                 │
└─────────────────────────────────────────────────────────────────┘

## How It Works

1. Shell Pod Creation (manager.go:112-137)

pod := &corev1.Pod{
      ObjectMeta: metav1.ObjectMeta{
          Name:      "shell",
          Namespace: "default",
          Labels:    map[string]string{"app": "workload"},
      },
      Spec: corev1.PodSpec{
          Containers: []corev1.Container{{
              Name:  "shell",
              Image: "alpine/socat:latest",
              Args: []string{
                  "TCP-LISTEN:8080,fork,reuseaddr",
                  "EXEC:/bin/sh,pty,stderr,setsid,sigint,sane",
              },
              Ports: []corev1.ContainerPort{{
                  ContainerPort: 8080,
                  Protocol:      corev1.ProtocolTCP,
              }},
          }},
      },
  }

  Socat Arguments Explained:

  | Argument        | Purpose                                                                            |
  |-----------------|------------------------------------------------------------------------------------|
  | TCP-LISTEN:8080 | Listen for TCP connections on port 8080                                            |
  | fork            | Spawn a new process for each connection (multi-user support)                       |
  | reuseaddr       | Allow reusing the socket address immediately                                       |
  | EXEC:/bin/sh    | Execute a shell (/bin/sh) for each connection                                      |
  | pty             | Allocate a pseudo-TTY (enables interactive features like arrow keys, text editors) |
  | stderr          | Merge stderr into the PTY output                                                   |
  | setsid          | Create a new session (proper process isolation)                                    |
  | sigint          | Pass SIGINT (Ctrl+C) to the shell process                                          |
  | sane            | Set terminal to sane mode (proper terminal emulation)                              |

  2. Connection Establishment (server.go:48-112)

  Step-by-step flow:

  1. Wait for pod readiness (lines 59-74)
  // Poll every 2 seconds for up to 120 seconds
  checkCmd := exec.Command("kubectl", "get", "pod", "shell", "-n", "default", "-o", "jsonpath={.status.phase}")
  checkCmd.Env = append(os.Environ(), "KUBECONFIG="+vclusterKubeconfigPath)
  2. Find free local port (lines 76-82)
  listener, err := net.Listen("tcp", "127.0.0.1:0")
  localPort := listener.Addr().(*net.TCPAddr).Port
  listener.Close()
  3. Start kubectl port-forward (lines 84-93)
  pf := exec.Command(
      "kubectl", "port-forward",
      "pod/shell", fmt.Sprintf("%d:8080", localPort),
      "-n", "default",
  )
  pf.Env = append(os.Environ(), "KUBECONFIG="+vclusterKubeconfigPath)
  pf.Start()
  4. Connect to forwarded port (lines 95-107)
  conn, err := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", localPort))

  3. Bidirectional Data Streaming (server.go:155-229)

  Two concurrent goroutines handle I/O:

  Goroutine 1: gRPC stdin → Shell (lines 205-215)
  go func() {
      for {
          msg, recvErr := stream.Recv()  // Receive from gRPC client
          if len(msg.Stdin) > 0 {
              ts.conn.Write(msg.Stdin)   // Write to TCP connection (socat)
          }
      }
  }()

  Goroutine 2: Shell → gRPC stdout (lines 217-229)
  buf := make([]byte, 4096)
  for {
      n, readErr := ts.conn.Read(buf)        // Read from TCP connection (socat)
      if n > 0 {
          stdoutWriter.Write(buf[:n])        // Send to gRPC client
      }
  }

## Key Features

Session Reuse

- Terminal sessions are cached in termSessions map (server.go:36)
- Multiple connections to the same sandbox reuse the port-forward
- Reduces overhead and connection time

Why Socat Over kubectl exec?

  | kubectl exec                       | socat approach                        |
  |------------------------------------|---------------------------------------|
  | Requires SPDY protocol to kubelet  | Uses standard TCP/HTTP                |
  | Kubelet must be network-reachable  | Only API server needs to be reachable |
  | Fails in OrbStack/k3d local setups | Works everywhere port-forward works   |
  | Tightly coupled to K8s internals   | Simple TCP socket communication       |

  Benefits

  1. Local dev compatibility: Works with OrbStack, k3d, kind, minikube
  2. Simplicity: Standard TCP instead of K8s-specific protocols
  3. Flexibility: Can run in environments with restricted kubelet access
  4. Multiple connections: fork option allows concurrent users (though current implementation has single-connection mutex)
  5. Full TTY support: Arrow keys, vim, nano, colored output all work correctly

  Security Considerations

  1. No authentication: Once connected to sandbox, shell access is unrestricted
  2. Isolation via vcluster: User can only access resources inside their vcluster
  3. TTL-based cleanup: Sandboxes expire automatically (default 2 hours)
  4. Network policies: Could restrict what the shell pod can access (not currently implemented)

  Example User Experience

  When a user connects to the terminal in the frontend:

  # User types: ls -la
  [Gateway WebSocket] → [gRPC ExecStream] → [kubectl port-forward] → [socat TCP:8080] → [/bin/sh]

  # Shell output
  [/bin/sh] → [socat TCP:8080] → [kubectl port-forward] → [gRPC ExecStream] → [Gateway WebSocket]

  # User sees:
  drwxr-xr-x    1 root     root          4096 Jan 15 10:30 .
  drwxr-xr-x    1 root     root          4096 Jan 15 10:30 ..
  -rw-r--r--    1 root     root           123 Jan 15 10:30 README.md

  The shell pod provides full kubectl access to the vcluster, allowing users to:
  - Deploy applications (kubectl apply -f ...)
  - Debug pods (kubectl logs, kubectl describe)
  - Access services (postgres, redis, etc.)
  - Run arbitrary commands in the isolated environment