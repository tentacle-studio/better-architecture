package sandbox

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/vcluster"
)

type Manager struct {
	k8sClient            *k8s.Client
	sandboxes            map[string]*Sandbox
	mu                   sync.RWMutex
	ttl                  time.Duration
	testerPodCIDR        string
	vclusterChartRepo    string
	vclusterChartVersion string
}

type Sandbox struct {
	ID               string
	UserID           string
	QuizID           string
	Namespace        string
	VClusterName     string
	VClusterEndpoint string
	Kubeconfig       string
	State            string
	CreatedAt        time.Time
	ExpiresAt        time.Time
}

func NewManager(k8sClient *k8s.Client, ttl time.Duration, testerPodCIDR, chartRepo, chartVersion string) *Manager {
	return &Manager{
		k8sClient:            k8sClient,
		sandboxes:            make(map[string]*Sandbox),
		ttl:                  ttl,
		testerPodCIDR:        testerPodCIDR,
		vclusterChartRepo:    chartRepo,
		vclusterChartVersion: chartVersion,
	}
}

func (m *Manager) CreateSandbox(ctx context.Context, userID, quizID, seedManifest string) (*Sandbox, error) {
	sandboxID := uuid.New().String()[:8]
	namespace := fmt.Sprintf("sandbox-%s-%s-%s", userID, quizID, sandboxID)
	vclusterName := fmt.Sprintf("vc-%s", sandboxID)

	sandbox := &Sandbox{
		ID:           sandboxID,
		UserID:       userID,
		QuizID:       quizID,
		Namespace:    namespace,
		VClusterName: vclusterName,
		State:        vcluster.StateCreating,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(m.ttl),
	}

	m.mu.Lock()
	m.sandboxes[sandboxID] = sandbox
	m.mu.Unlock()

	config := vcluster.VClusterConfig{
		Name:              vclusterName,
		Namespace:         namespace,
		ChartRepo:         m.vclusterChartRepo,
		ChartVersion:      m.vclusterChartVersion,
		NetworkPolicyCIDR: m.testerPodCIDR,
	}

	provisioner := vcluster.NewProvisioner(m.k8sClient, config)
	status, err := provisioner.Create(ctx)
	if err != nil {
		sandbox.State = vcluster.StateFailed
		return sandbox, fmt.Errorf("failed to create vcluster: %w", err)
	}

	sandbox.State = status.State
	sandbox.VClusterEndpoint = status.Endpoint

	if seedManifest != "" {
		if err := m.applySeedData(ctx, namespace, seedManifest); err != nil {
			return sandbox, fmt.Errorf("failed to apply seed data: %w", err)
		}
	}

	kubeconfig, err := m.k8sClient.CreateVClusterKubeconfig(ctx, namespace, vclusterName)
	if err != nil {
		return sandbox, fmt.Errorf("failed to create kubeconfig: %w", err)
	}
	sandbox.Kubeconfig = kubeconfig

	return sandbox, nil
}

func (m *Manager) DestroySandbox(ctx context.Context, sandboxID string) error {
	m.mu.RLock()
	sandbox, exists := m.sandboxes[sandboxID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("sandbox %s not found", sandboxID)
	}

	sandbox.State = vcluster.StateDestroying

	config := vcluster.VClusterConfig{
		Name:      sandbox.VClusterName,
		Namespace: sandbox.Namespace,
	}

	provisioner := vcluster.NewProvisioner(m.k8sClient, config)
	if err := provisioner.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete vcluster: %w", err)
	}

	m.mu.Lock()
	delete(m.sandboxes, sandboxID)
	m.mu.Unlock()

	return nil
}

func (m *Manager) GetSandbox(sandboxID string) (*Sandbox, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sandbox, exists := m.sandboxes[sandboxID]
	if !exists {
		return nil, fmt.Errorf("sandbox %s not found", sandboxID)
	}

	return sandbox, nil
}

func (m *Manager) GetK8sClient() *k8s.Client {
	return m.k8sClient
}

func (m *Manager) applySeedData(ctx context.Context, namespace, seedManifest string) error {
	manifestBytes, err := base64.StdEncoding.DecodeString(seedManifest)
	if err != nil {
		return fmt.Errorf("failed to decode seed manifest: %w", err)
	}

	seeder, err := NewSeeder(m.k8sClient.GetConfig())
	if err != nil {
		return fmt.Errorf("failed to create seeder: %w", err)
	}

	if err := seeder.ApplyManifest(ctx, namespace, string(manifestBytes)); err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	return nil
}
