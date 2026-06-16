package vcluster

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type HealthChecker struct {
	k8sClient *k8s.Client
	interval  time.Duration
	timeout   time.Duration
}

func NewHealthChecker(k8sClient *k8s.Client, interval, timeout time.Duration) *HealthChecker {
	return &HealthChecker{
		k8sClient: k8sClient,
		interval:  interval,
		timeout:   timeout,
	}
}

func (h *HealthChecker) WaitForReady(ctx context.Context, namespace, vclusterName string) error {
	ctx, cancel := context.WithTimeout(ctx, h.timeout)
	defer cancel()

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	backoff := h.interval
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for vcluster to be ready: %w", ctx.Err())
		case <-ticker.C:
			ready, err := h.checkHealth(ctx, namespace, vclusterName)
			if err != nil {
				if backoff < maxBackoff {
					backoff *= 2
					if backoff > maxBackoff {
						backoff = maxBackoff
					}
				}
				ticker.Reset(backoff)
				continue
			}

			if ready {
				return nil
			}

			backoff = h.interval
			ticker.Reset(backoff)
		}
	}
}

func (h *HealthChecker) checkHealth(ctx context.Context, namespace, vclusterName string) (bool, error) {
	serviceName := vclusterName
	port := 443

	service, err := h.k8sClient.Clientset.CoreV1().Services(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return false, fmt.Errorf("failed to get vcluster service: %w", err)
	}

	if len(service.Spec.ClusterIP) == 0 {
		return false, fmt.Errorf("service has no cluster IP")
	}

	endpoint := fmt.Sprintf("https://%s:%d", service.Spec.ClusterIP, port)

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   5 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint+"/readyz", nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return false, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return true, nil
	}

	return false, nil
}
