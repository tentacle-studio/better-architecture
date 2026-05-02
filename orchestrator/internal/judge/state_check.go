package judge

import (
	"context"
	"fmt"
	"strings"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	}

	resource, err := c.fetchResource(ctx, spec)
	if err != nil {
		result.Message = fmt.Sprintf("failed to get resource: %v", err)
		return result, nil
	}

	passed, msg, err := checkConditions(resource.Object, spec.ExpectedState)
	if err != nil {
		result.Message = fmt.Sprintf("error evaluating conditions: %v", err)
		return result, nil
	}
	result.Passed = passed
	result.Message = msg
	return result, nil
}

func (c *StateChecker) fetchResource(ctx context.Context, spec StateCheckSpec) (*unstructured.Unstructured, error) {
	if c.k8sClient == nil {
		return nil, fmt.Errorf("k8s client not configured")
	}
	gvr, err := c.getGVR(spec.ResourceType)
	if err != nil {
		return nil, fmt.Errorf("get GVR for %s: %w", spec.ResourceType, err)
	}
	dynamicClient, err := c.k8sClient.GetDynamicClient()
	if err != nil {
		return nil, fmt.Errorf("get dynamic client: %w", err)
	}
	if spec.Namespace != "" {
		return dynamicClient.Resource(gvr).Namespace(spec.Namespace).Get(ctx, spec.ResourceName, metav1.GetOptions{})
	}
	return dynamicClient.Resource(gvr).Get(ctx, spec.ResourceName, metav1.GetOptions{})
}

type pathSegment struct {
	key   string
	index int
}

func parsePathSegments(path string) []pathSegment {
	parts := strings.Split(path, ".")
	segments := make([]pathSegment, 0, len(parts))
	for _, part := range parts {
		seg := pathSegment{index: -1}
		if bracketIdx := strings.Index(part, "["); bracketIdx != -1 {
			seg.key = part[:bracketIdx]
			indexStr := part[bracketIdx+1 : len(part)-1]
			fmt.Sscanf(indexStr, "%d", &seg.index)
		} else {
			seg.key = part
		}
		segments = append(segments, seg)
	}
	return segments
}

func evalPath(obj map[string]interface{}, path string) (string, bool, error) {
	segments := parsePathSegments(path)
	var current interface{} = obj
	for _, seg := range segments {
		m, ok := current.(map[string]interface{})
		if !ok {
			return "", false, fmt.Errorf("expected object at %q, got %T", seg.key, current)
		}
		val, exists := m[seg.key]
		if !exists {
			return "", false, nil
		}
		if seg.index >= 0 {
			arr, ok := val.([]interface{})
			if !ok {
				return "", false, fmt.Errorf("path segment %q is not an array, got %T", seg.key, val)
			}
			if seg.index >= len(arr) {
				return "", false, nil
			}
			current = arr[seg.index]
		} else {
			current = val
		}
	}
	return fmt.Sprintf("%v", current), true, nil
}

func checkConditions(obj map[string]interface{}, conditions map[string]string) (bool, string, error) {
	for path, expected := range conditions {
		actual, found, err := evalPath(obj, path)
		if err != nil {
			return false, fmt.Sprintf("error evaluating %q: %v", path, err), err
		}
		if !found {
			return false, fmt.Sprintf("path %q not found in resource", path), nil
		}
		if actual != expected {
			return false, fmt.Sprintf("condition %q: expected %q, got %q", path, expected, actual), nil
		}
	}
	return true, "all conditions met", nil
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

func (c *StateChecker) matchesExpectedState(actual, expected map[string]string) bool {
	for key, expectedValue := range expected {
		actualValue, exists := actual[key]
		if !exists || actualValue != expectedValue {
			return false
		}
	}
	return true
}
