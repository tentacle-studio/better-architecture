package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	GRPCPort             string
	KubeConfigPath       string
	VClusterNamespace    string
	VClusterChartRepo    string
	VClusterChartVersion string
	SandboxTTL           time.Duration
	MaxSandboxesPerUser  int
	NATSUrl              string
	OTelEndpoint         string
	TesterPodCIDR        string
	HealthCheckInterval  time.Duration
	HealthCheckTimeout   time.Duration
	TemporalHost         string
	TemporalNamespace    string
	TemporalTaskQueue    string
}

func Load() *Config {
	return &Config{
		GRPCPort:             getEnv("GRPC_PORT", "50051"),
		KubeConfigPath:       getEnv("KUBECONFIG", ""),
		VClusterNamespace:    getEnv("VCLUSTER_NAMESPACE", "vcluster-system"),
		VClusterChartRepo:    getEnv("VCLUSTER_CHART_REPO", "https://charts.loft.sh"),
		VClusterChartVersion: getEnv("VCLUSTER_CHART_VERSION", "0.33.1"),
		SandboxTTL:           getDurationEnv("SANDBOX_TTL", 2*time.Hour),
		MaxSandboxesPerUser:  getIntEnv("MAX_SANDBOXES_PER_USER", 5),
		NATSUrl:              getEnv("NATS_URL", "nats://localhost:4222"),
		OTelEndpoint:         getEnv("OTEL_ENDPOINT", "localhost:4317"),
		TesterPodCIDR:        getEnv("TESTER_POD_CIDR", "10.244.0.0/16"),
		HealthCheckInterval:  getDurationEnv("HEALTH_CHECK_INTERVAL", 2*time.Second),
		HealthCheckTimeout:   getDurationEnv("HEALTH_CHECK_TIMEOUT", 90*time.Second),
		TemporalHost:         getEnv("TEMPORAL_HOST", "localhost:7233"),
		TemporalNamespace:    getEnv("TEMPORAL_NAMESPACE", "default"),
		TemporalTaskQueue:    getEnv("TEMPORAL_TASK_QUEUE", "lab-provisioning"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
