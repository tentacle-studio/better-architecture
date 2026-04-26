package vcluster

import (
	"context"
	"fmt"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
)

type Provisioner struct {
	k8sClient *k8s.Client
	config    VClusterConfig
}

func NewProvisioner(k8sClient *k8s.Client, config VClusterConfig) *Provisioner {
	return &Provisioner{
		k8sClient: k8sClient,
		config:    config,
	}
}

func (p *Provisioner) Create(ctx context.Context) (*VClusterStatus, error) {
	status := &VClusterStatus{
		Name:      p.config.Name,
		Namespace: p.config.Namespace,
		State:     StateCreating,
		CreatedAt: time.Now(),
		Ready:     false,
	}

	labels := map[string]string{
		"app":      "vcluster",
		"vcluster": p.config.Name,
	}

	if err := p.k8sClient.CreateNamespace(ctx, p.config.Namespace, labels); err != nil {
		status.State = StateFailed
		status.Message = fmt.Sprintf("failed to create namespace: %v", err)
		return status, err
	}

	if err := p.deployVCluster(ctx); err != nil {
		status.State = StateFailed
		status.Message = fmt.Sprintf("failed to deploy vcluster: %v", err)
		return status, err
	}

	if err := p.k8sClient.ApplyNetworkPolicy(ctx, p.config.Namespace, p.config.NetworkPolicyCIDR); err != nil {
		status.State = StateFailed
		status.Message = fmt.Sprintf("failed to apply network policy: %v", err)
		return status, err
	}

	status.State = StateReady
	status.Ready = true
	status.Message = "vCluster created successfully"

	return status, nil
}

func (p *Provisioner) Delete(ctx context.Context) error {
	if err := p.uninstallVCluster(ctx); err != nil {
		return fmt.Errorf("failed to uninstall vcluster: %w", err)
	}

	if err := p.k8sClient.DeleteNamespace(ctx, p.config.Namespace); err != nil {
		return fmt.Errorf("failed to delete namespace: %w", err)
	}

	return nil
}

func (p *Provisioner) deployVCluster(ctx context.Context) error {
	actionConfig, err := p.getHelmActionConfig(p.config.Namespace)
	if err != nil {
		return fmt.Errorf("failed to get helm action config: %w", err)
	}

	install := action.NewInstall(actionConfig)
	install.Namespace = p.config.Namespace
	install.ReleaseName = p.config.Name
	install.CreateNamespace = false
	install.Wait = true
	install.Timeout = 5 * time.Minute

	chartPath, err := install.ChartPathOptions.LocateChart(p.config.ChartRepo+"/vcluster", &cli.EnvSettings{})
	if err != nil {
		return fmt.Errorf("failed to locate chart: %w", err)
	}

	chart, err := loader.Load(chartPath)
	if err != nil {
		return fmt.Errorf("failed to load chart: %w", err)
	}

	values := map[string]interface{}{
		"sync": map[string]interface{}{
			"pods": map[string]interface{}{
				"enabled": true,
			},
			"services": map[string]interface{}{
				"enabled": true,
			},
			"configmaps": map[string]interface{}{
				"enabled": true,
			},
		},
		"storage": map[string]interface{}{
			"size": "5Gi",
		},
	}

	if p.config.Values != nil {
		for k, v := range p.config.Values {
			values[k] = v
		}
	}

	_, err = install.RunWithContext(ctx, chart, values)
	if err != nil {
		return fmt.Errorf("failed to install vcluster: %w", err)
	}

	return nil
}

func (p *Provisioner) uninstallVCluster(ctx context.Context) error {
	actionConfig, err := p.getHelmActionConfig(p.config.Namespace)
	if err != nil {
		return fmt.Errorf("failed to get helm action config: %w", err)
	}

	uninstall := action.NewUninstall(actionConfig)
	uninstall.Wait = true
	uninstall.Timeout = 5 * time.Minute

	_, err = uninstall.Run(p.config.Name)
	if err != nil {
		return fmt.Errorf("failed to uninstall vcluster: %w", err)
	}

	return nil
}

func (p *Provisioner) getHelmActionConfig(namespace string) (*action.Configuration, error) {
	actionConfig := new(action.Configuration)

	settings := cli.New()

	err := actionConfig.Init(settings.RESTClientGetter(), namespace, "secret", func(format string, v ...interface{}) {
		fmt.Printf(format+"\n", v...)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	return actionConfig, nil
}
