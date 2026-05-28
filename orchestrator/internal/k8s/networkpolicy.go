package k8s

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func (c *Client) ApplyNetworkPolicy(ctx context.Context, namespace, testerCIDR string) error {
	// Default deny all policy
	defaultDeny := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "default-deny-all",
			Namespace: namespace,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{},
			PolicyTypes: []networkingv1.PolicyType{
				networkingv1.PolicyTypeIngress,
				networkingv1.PolicyTypeEgress,
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{
				// Allow DNS
				{
					To: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{
									"kubernetes.io/metadata.name": "kube-system",
								},
							},
						},
					},
					Ports: []networkingv1.NetworkPolicyPort{
						{
							Protocol: func() *corev1.Protocol { p := corev1.ProtocolUDP; return &p }(),
							Port:     &intstr.IntOrString{Type: intstr.Int, IntVal: 53},
						},
					},
				},
				// Allow intra-namespace
				{
					To: []networkingv1.NetworkPolicyPeer{
						{
							PodSelector: &metav1.LabelSelector{},
						},
					},
				},
			},
		},
	}

	if err := c.createNetworkPolicyIfNotExists(ctx, namespace, defaultDeny); err != nil {
		return fmt.Errorf("failed to create default deny policy: %w", err)
	}

	// IMDS protection policy
	imdsBlock := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "block-metadata",
			Namespace: namespace,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{},
			PolicyTypes: []networkingv1.PolicyType{
				networkingv1.PolicyTypeEgress,
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{
				{
					To: []networkingv1.NetworkPolicyPeer{
						{
							IPBlock: &networkingv1.IPBlock{
								CIDR: "0.0.0.0/0",
								Except: []string{
									"169.254.169.254/32", // AWS IMDS
									"100.100.100.200/32", // Alibaba
								},
							},
						},
					},
				},
			},
		},
	}

	if err := c.createNetworkPolicyIfNotExists(ctx, namespace, imdsBlock); err != nil {
		return fmt.Errorf("failed to create IMDS block policy: %w", err)
	}

	return nil
}

func (c *Client) createNetworkPolicyIfNotExists(ctx context.Context, namespace string, policy *networkingv1.NetworkPolicy) error {
	existing, err := c.Clientset.NetworkingV1().NetworkPolicies(namespace).Get(ctx, policy.Name, metav1.GetOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to check network policy: %w", err)
	}

	if existing != nil && existing.Name != "" {
		return nil
	}

	_, err = c.Clientset.NetworkingV1().NetworkPolicies(namespace).Create(ctx, policy, metav1.CreateOptions{})
	if err != nil {
		if errors.IsAlreadyExists(err) {
			return nil
		}
		return fmt.Errorf("failed to create network policy: %w", err)
	}

	return nil
}
