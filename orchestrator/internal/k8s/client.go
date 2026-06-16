package k8s

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type Client struct {
	Clientset *kubernetes.Clientset
	Config    *rest.Config
}

func NewClient(kubeconfigPath string) (*Client, error) {
	var config *rest.Config
	var err error

	if kubeconfigPath != "" {
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	} else {
		config, err = rest.InClusterConfig()
	}

	if err != nil {
		return nil, fmt.Errorf("failed to build kubeconfig: %w", err)
	}

	// Force TLS skip for local dev (host.docker.internal cert mismatch)
	config.TLSClientConfig.Insecure = true
	config.TLSClientConfig.CAFile = ""
	config.TLSClientConfig.CAData = nil

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	return &Client{
		Clientset: clientset,
		Config:    config,
	}, nil
}

// NewClientFromKubeconfig creates a K8s client from a base64-encoded kubeconfig string
func NewClientFromKubeconfig(kubeconfigBase64 string) (*Client, error) {
	kubeconfigBytes, err := base64.StdEncoding.DecodeString(kubeconfigBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode kubeconfig: %w", err)
	}

	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to build config from kubeconfig: %w", err)
	}

	// Force TLS skip for local dev (host.docker.internal cert mismatch)
	config.TLSClientConfig.Insecure = true
	config.TLSClientConfig.CAFile = ""
	config.TLSClientConfig.CAData = nil

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	return &Client{
		Clientset: clientset,
		Config:    config,
	}, nil
}

func (c *Client) CreateVClusterKubeconfig(ctx context.Context, namespace, vclusterName string) (string, error) {
	// vCluster exports a kubeconfig in a secret named vc-{vclusterName}
	secretName := fmt.Sprintf("vc-%s", vclusterName)
	secret, err := c.Clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get vcluster kubeconfig secret: %w", err)
	}

	config, ok := secret.Data["config"]
	if !ok {
		return "", fmt.Errorf("kubeconfig not found in secret")
	}

	// Get the vCluster service to resolve the server address
	svc, err := c.Clientset.CoreV1().Services(namespace).Get(ctx, vclusterName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get vcluster service: %w", err)
	}

	// Replace $(POD_IP) placeholder with the actual service ClusterIP:port
	serverAddr := fmt.Sprintf("https://%s:443", svc.Spec.ClusterIP)
	configStr := string(config)

	// Replace the placeholder
	configStr = strings.ReplaceAll(configStr, "https://$(POD_IP)", serverAddr)

	return base64.StdEncoding.EncodeToString([]byte(configStr)), nil
}

func (c *Client) getServiceAccountToken(ctx context.Context, namespace, saName string) (*corev1.Secret, error) {
	secrets, err := c.Clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets: %w", err)
	}

	for _, secret := range secrets.Items {
		if secret.Type == corev1.SecretTypeServiceAccountToken {
			if ownerRef := secret.Annotations["kubernetes.io/service-account.name"]; ownerRef == saName {
				return &secret, nil
			}
		}
	}

	return nil, fmt.Errorf("service account token secret not found for %s", saName)
}

func (c *Client) GetDynamicClient() (dynamic.Interface, error) {
	return dynamic.NewForConfig(c.Config)
}

func (c *Client) GetConfig() *rest.Config {
	return c.Config
}
