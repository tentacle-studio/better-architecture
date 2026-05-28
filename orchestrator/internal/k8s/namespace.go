package k8s

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (c *Client) CreateNamespace(ctx context.Context, name string, labels map[string]string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   name,
			Labels: labels,
		},
	}

	_, err := c.Clientset.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %w", name, err)
	}

	if err := c.ApplyResourceQuota(ctx, name); err != nil {
		return fmt.Errorf("failed to apply resource quota: %w", err)
	}

	if err := c.ApplyLimitRange(ctx, name); err != nil {
		return fmt.Errorf("failed to apply limit range: %w", err)
	}

	return nil
}

func (c *Client) DeleteNamespace(ctx context.Context, name string) error {
	err := c.Clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace %s: %w", name, err)
	}
	return nil
}
