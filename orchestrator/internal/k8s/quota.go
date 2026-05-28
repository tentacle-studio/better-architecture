package k8s

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (c *Client) ApplyResourceQuota(ctx context.Context, namespace string) error {
	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "sandbox-quota",
			Namespace: namespace,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: corev1.ResourceList{
				corev1.ResourcePods:           resource.MustParse("10"),
				corev1.ResourceRequestsCPU:    resource.MustParse("2"),
				corev1.ResourceRequestsMemory: resource.MustParse("4Gi"),
				corev1.ResourceLimitsCPU:      resource.MustParse("4"),
				corev1.ResourceLimitsMemory:   resource.MustParse("8Gi"),
			},
		},
	}

	existing, err := c.Clientset.CoreV1().ResourceQuotas(namespace).Get(ctx, "sandbox-quota", metav1.GetOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to check resource quota: %w", err)
	}

	if existing != nil && existing.Name != "" {
		return nil
	}

	_, err = c.Clientset.CoreV1().ResourceQuotas(namespace).Create(ctx, quota, metav1.CreateOptions{})
	if err != nil {
		if errors.IsAlreadyExists(err) {
			return nil
		}
		return fmt.Errorf("failed to create resource quota: %w", err)
	}

	return nil
}

func (c *Client) ApplyLimitRange(ctx context.Context, namespace string) error {
	limitRange := &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "sandbox-limits",
			Namespace: namespace,
		},
		Spec: corev1.LimitRangeSpec{
			Limits: []corev1.LimitRangeItem{
				{
					Type: corev1.LimitTypeContainer,
					Default: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("500m"),
						corev1.ResourceMemory: resource.MustParse("512Mi"),
					},
					DefaultRequest: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("100m"),
						corev1.ResourceMemory: resource.MustParse("128Mi"),
					},
				},
			},
		},
	}

	existing, err := c.Clientset.CoreV1().LimitRanges(namespace).Get(ctx, "sandbox-limits", metav1.GetOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to check limit range: %w", err)
	}

	if existing != nil && existing.Name != "" {
		return nil
	}

	_, err = c.Clientset.CoreV1().LimitRanges(namespace).Create(ctx, limitRange, metav1.CreateOptions{})
	if err != nil {
		if errors.IsAlreadyExists(err) {
			return nil
		}
		return fmt.Errorf("failed to create limit range: %w", err)
	}

	return nil
}
