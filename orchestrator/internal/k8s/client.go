package k8s

import (
	"context"
	"encoding/base64"
	"fmt"

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
	serviceName := vclusterName

	service, err := c.Clientset.CoreV1().Services(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get vcluster service: %w", err)
	}

	if len(service.Spec.ClusterIP) == 0 {
		return "", fmt.Errorf("service has no cluster IP")
	}

	endpoint := fmt.Sprintf("https://%s:443", service.Spec.ClusterIP)

	secretName := fmt.Sprintf("vc-%s-certs", vclusterName)
	secret, err := c.Clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get vcluster secret: %w", err)
	}

	caCert, ok := secret.Data["ca.crt"]
	if !ok {
		return "", fmt.Errorf("ca.crt not found in secret")
	}

	saName := "vc-workload-admin"
	saSecret, err := c.getServiceAccountToken(ctx, namespace, saName)
	if err != nil {
		return "", fmt.Errorf("failed to get service account token: %w", err)
	}

	token, ok := saSecret.Data["token"]
	if !ok {
		return "", fmt.Errorf("token not found in service account secret")
	}

	kubeconfig := fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: %s
    server: %s
  name: vcluster
contexts:
- context:
    cluster: vcluster
    user: vcluster-user
  name: vcluster
current-context: vcluster
users:
- name: vcluster-user
  user:
    token: %s
`, base64.StdEncoding.EncodeToString(caCert), endpoint, string(token))

	return base64.StdEncoding.EncodeToString([]byte(kubeconfig)), nil
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
