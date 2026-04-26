package vcluster

import "time"

type VClusterConfig struct {
	Name              string
	Namespace         string
	ChartRepo         string
	ChartVersion      string
	Values            map[string]interface{}
	SyncResources     []string
	ResourceQuota     ResourceQuotaConfig
	NetworkPolicyCIDR string
}

type ResourceQuotaConfig struct {
	MaxPods       int
	MaxCPU        string
	MaxMemory     string
	MaxStorage    string
}

type VClusterStatus struct {
	Name       string
	Namespace  string
	State      string
	Endpoint   string
	CreatedAt  time.Time
	ExpiresAt  time.Time
	Ready      bool
	Message    string
}

const (
	StateCreating   = "creating"
	StateReady      = "ready"
	StateDestroying = "destroying"
	StateFailed     = "failed"
)
