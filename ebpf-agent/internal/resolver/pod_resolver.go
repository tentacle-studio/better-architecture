package resolver

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// PodInfo holds the sandbox-relevant identity of a pod.
type PodInfo struct {
	PodName   string
	Namespace string
	UserID    string
	SandboxID string
	PodIP     string
}

// PodResolver maintains an in-memory IP → PodInfo index rebuilt from K8s watch events.
// Only pods in namespaces matching "sandbox-{userId}-{sandboxId}" are indexed.
type PodResolver struct {
	mu     sync.RWMutex
	byIP   map[string]*PodInfo
	client kubernetes.Interface
}

// New creates a PodResolver. kubeconfigPath="" uses in-cluster config.
func New(kubeconfigPath string) (*PodResolver, error) {
	var cfg *rest.Config
	var err error

	if kubeconfigPath != "" {
		cfg, err = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	} else {
		cfg, err = rest.InClusterConfig()
	}
	if err != nil {
		return nil, fmt.Errorf("k8s config: %w", err)
	}

	client, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("k8s client: %w", err)
	}

	return &PodResolver{
		byIP:   make(map[string]*PodInfo),
		client: client,
	}, nil
}

// LookupIP resolves a raw 4-byte slice (network byte order) to PodInfo.
// Returns nil, false if the IP does not belong to a sandbox pod.
func (r *PodResolver) LookupIP(raw [4]byte) (*PodInfo, bool) {
	ip := net.IP(raw[:]).String()
	r.mu.RLock()
	info, ok := r.byIP[ip]
	r.mu.RUnlock()
	return info, ok
}

// LookupIPStr resolves a dotted-decimal IP string.
func (r *PodResolver) LookupIPStr(ip string) (*PodInfo, bool) {
	r.mu.RLock()
	info, ok := r.byIP[ip]
	r.mu.RUnlock()
	return info, ok
}

// Watch does an initial list then watches all namespaces for pod events.
// It re-starts the watch on error with a 5 s back-off.
func (r *PodResolver) Watch(ctx context.Context) error {
	if err := r.refresh(ctx); err != nil {
		return err
	}
	go func() {
		for {
			if err := r.runWatch(ctx); err != nil {
				if ctx.Err() != nil {
					return
				}
				time.Sleep(5 * time.Second)
			}
		}
	}()
	return nil
}

func (r *PodResolver) runWatch(ctx context.Context) error {
	watcher, err := r.client.CoreV1().Pods("").Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("pod watch: %w", err)
	}
	defer watcher.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case ev, ok := <-watcher.ResultChan():
			if !ok {
				return fmt.Errorf("watch channel closed")
			}
			pod, ok := ev.Object.(*corev1.Pod)
			if !ok {
				continue
			}
			if !strings.HasPrefix(pod.Namespace, "sandbox-") {
				continue
			}
			switch ev.Type {
			case watch.Added, watch.Modified:
				r.upsertPod(pod)
			case watch.Deleted:
				r.deletePod(pod)
			}
		}
	}
}

func (r *PodResolver) refresh(ctx context.Context) error {
	list, err := r.client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("pod list: %w", err)
	}
	r.mu.Lock()
	r.byIP = make(map[string]*PodInfo, len(list.Items))
	r.mu.Unlock()
	for i := range list.Items {
		r.upsertPod(&list.Items[i])
	}
	return nil
}

func (r *PodResolver) upsertPod(pod *corev1.Pod) {
	if !strings.HasPrefix(pod.Namespace, "sandbox-") || pod.Status.PodIP == "" {
		return
	}
	// Namespace format: sandbox-{userId}-{sandboxId}
	parts := strings.SplitN(pod.Namespace, "-", 3)
	if len(parts) < 3 {
		return
	}
	info := &PodInfo{
		PodName:   pod.Name,
		Namespace: pod.Namespace,
		UserID:    parts[1],
		SandboxID: parts[2],
		PodIP:     pod.Status.PodIP,
	}
	r.mu.Lock()
	r.byIP[pod.Status.PodIP] = info
	r.mu.Unlock()
}

func (r *PodResolver) deletePod(pod *corev1.Pod) {
	if pod.Status.PodIP == "" {
		return
	}
	r.mu.Lock()
	delete(r.byIP, pod.Status.PodIP)
	r.mu.Unlock()
}
