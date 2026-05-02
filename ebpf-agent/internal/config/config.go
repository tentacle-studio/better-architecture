package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	NatsURL         string
	KubeConfigPath  string        // empty → in-cluster config
	NodeName        string        // populated via K8s downward API (spec.nodeName)
	PublishInterval time.Duration // how often to flush NATS batches
}

func Load() (*Config, error) {
	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		return nil, fmt.Errorf("NATS_URL is required")
	}

	nodeName := os.Getenv("NODE_NAME")
	if nodeName == "" {
		return nil, fmt.Errorf("NODE_NAME is required (set via downward API: spec.nodeName)")
	}

	intervalMs := 50
	if v := os.Getenv("PUBLISH_INTERVAL_MS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			intervalMs = n
		}
	}

	return &Config{
		NatsURL:         natsURL,
		KubeConfigPath:  os.Getenv("KUBECONFIG"),
		NodeName:        nodeName,
		PublishInterval: time.Duration(intervalMs) * time.Millisecond,
	}, nil
}
