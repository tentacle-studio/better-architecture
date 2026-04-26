package judge

import (
	"context"
	"fmt"
	"strings"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type StateChecker struct {
	k8sClient *k8s.Client
}

type StateCheckSpec struct {
	Name          string            `json:"name"`
	ResourceType  string            `json:"resource_type"`
	ResourceName  string            `json:"resource_name"`
	Namespace     string            `json:"namespace"`
	ExpectedState map[string]string `json:"expected_state"`
	Points        int32             `json:"points"`
}

func NewStateChecker(k8sClient *k8s.Client) *StateChecker {
	return &StateChecker{
		k8sClient: k8sClient,
	}
}

func (c *StateChecker) Check(ctx context.Context, sandboxID string, spec StateCheckSpec) (CheckResult, error) {
	result := CheckResult{
		CheckName: spec.Name,
		Points:    spec.Points,
		Passed:    false,
	}

	actualState, err := c.getResourceState(ctx, spec)
	if err != nil {
		result.Message = fmt.Sprintf("Failed to get resource state: %v", err)
		return result, nil
	}

	if c.matchesExpectedState(actualState, spec.ExpectedState) {
		result.Passed = true
		result.Message = "Resource state matches expected state"
	} else {
		result.Message = fmt.Sprintf("Resource state does not match. Expected: %v, Got: %v", spec.ExpectedState, actualState)
	}

	return result, nil
}

func (c *StateChecker) getResourceState(ctx context.Context, spec StateCheckSpec) (map[string]string, error) {
	gvr, err := c.getGVR(spec.ResourceType)
	if err != nil {
		return nil, fmt.Errorf("failed to get GVR for resource type %s: %w", spec.ResourceType, err)
	}

	dynamicClient, err := c.k8sClient.GetDynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	var resource *unstructured.Unstructured
	if spec.Namespace != "" {
		resource, err = dynamicClient.Resource(gvr).Namespace(spec.Namespace).Get(ctx, spec.ResourceName, metav1.GetOptions{})
	} else {
		resource, err = dynamicClient.Resource(gvr).Get(ctx, spec.ResourceName, metav1.GetOptions{})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get resource %s/%s: %w", spec.ResourceType, spec.ResourceName, err)
	}

	return c.extractState(resource, spec.ResourceType)
}

func (c *StateChecker) getGVR(resourceType string) (schema.GroupVersionResource, error) {
	resourceType = strings.ToLower(resourceType)

	gvrMap := map[string]schema.GroupVersionResource{
		"pod": {
			Group:    "",
			Version:  "v1",
			Resource: "pods",
		},
		"service": {
			Group:    "",
			Version:  "v1",
			Resource: "services",
		},
		"deployment": {
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		},
		"statefulset": {
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		},
		"configmap": {
			Group:    "",
			Version:  "v1",
			Resource: "configmaps",
		},
		"secret": {
			Group:    "",
			Version:  "v1",
			Resource: "secrets",
		},
		"ingress": {
			Group:    "networking.k8s.io",
			Version:  "v1",
			Resource: "ingresses",
		},
	}

	gvr, ok := gvrMap[resourceType]
	if !ok {
		return schema.GroupVersionResource{}, fmt.Errorf("unsupported resource type: %s", resourceType)
	}

	return gvr, nil
}

func (c *StateChecker) extractState(resource *unstructured.Unstructured, resourceType string) (map[string]string, error) {
	state := make(map[string]string)
	resourceType = strings.ToLower(resourceType)

	switch resourceType {
	case "pod":
		if phase, found, _ := unstructured.NestedString(resource.Object, "status", "phase"); found {
			state["phase"] = phase
		}
		if ready, found, _ := unstructured.NestedString(resource.Object, "status", "conditions"); found {
			state["ready"] = ready
		}

	case "deployment":
		if replicas, found, _ := unstructured.NestedInt64(resource.Object, "status", "replicas"); found {
			state["replicas"] = fmt.Sprintf("%d", replicas)
		}
		if readyReplicas, found, _ := unstructured.NestedInt64(resource.Object, "status", "readyReplicas"); found {
			state["readyReplicas"] = fmt.Sprintf("%d", readyReplicas)
		}
		if availableReplicas, found, _ := unstructured.NestedInt64(resource.Object, "status", "availableReplicas"); found {
			state["availableReplicas"] = fmt.Sprintf("%d", availableReplicas)
		}

	case "service":
		if clusterIP, found, _ := unstructured.NestedString(resource.Object, "spec", "clusterIP"); found {
			state["clusterIP"] = clusterIP
		}
		if serviceType, found, _ := unstructured.NestedString(resource.Object, "spec", "type"); found {
			state["type"] = serviceType
		}

	case "statefulset":
		if replicas, found, _ := unstructured.NestedInt64(resource.Object, "status", "replicas"); found {
			state["replicas"] = fmt.Sprintf("%d", replicas)
		}
		if readyReplicas, found, _ := unstructured.NestedInt64(resource.Object, "status", "readyReplicas"); found {
			state["readyReplicas"] = fmt.Sprintf("%d", readyReplicas)
		}
	}

	metadata := resource.Object["metadata"].(map[string]interface{})
	if labels, ok := metadata["labels"].(map[string]interface{}); ok {
		for k, v := range labels {
			state[fmt.Sprintf("label.%s", k)] = fmt.Sprintf("%v", v)
		}
	}

	return state, nil
}

func (c *StateChecker) matchesExpectedState(actual, expected map[string]string) bool {
	for key, expectedValue := range expected {
		actualValue, exists := actual[key]
		if !exists || actualValue != expectedValue {
			return false
		}
	}
	return true
}
