package sandbox

import (
	"context"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	sigsyaml "sigs.k8s.io/yaml"
)

type Seeder struct {
	dynamicClient dynamic.Interface
	config        *rest.Config
}

func NewSeeder(config *rest.Config) (*Seeder, error) {
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	return &Seeder{
		dynamicClient: dynamicClient,
		config:        config,
	}, nil
}

func (s *Seeder) ApplyManifest(ctx context.Context, namespace, manifest string) error {
	manifests := strings.Split(manifest, "---")

	for i, manifestDoc := range manifests {
		manifestDoc = strings.TrimSpace(manifestDoc)
		if manifestDoc == "" {
			continue
		}

		jsonBytes, err := sigsyaml.YAMLToJSON([]byte(manifestDoc))
		if err != nil {
			return fmt.Errorf("failed to convert YAML to JSON (document %d): %w", i, err)
		}

		obj := &unstructured.Unstructured{}
		if err := obj.UnmarshalJSON(jsonBytes); err != nil {
			return fmt.Errorf("failed to decode manifest (document %d): %w", i, err)
		}

		if obj.GetNamespace() == "" {
			obj.SetNamespace(namespace)
		}

		gvk := obj.GroupVersionKind()
		gvr, err := s.getGVR(gvk)
		if err != nil {
			return fmt.Errorf("failed to get resource type for %s (document %d): %w", gvk.Kind, i, err)
		}

		_, err = s.dynamicClient.Resource(gvr).Namespace(obj.GetNamespace()).Create(ctx, obj, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("failed to create resource %s/%s (document %d): %w", gvk.Kind, obj.GetName(), i, err)
		}
	}

	return nil
}

func (s *Seeder) getGVR(gvk schema.GroupVersionKind) (schema.GroupVersionResource, error) {
	kind := strings.ToLower(gvk.Kind)

	resourceMap := map[string]string{
		"deployment":  "deployments",
		"service":     "services",
		"pod":         "pods",
		"configmap":   "configmaps",
		"secret":      "secrets",
		"ingress":     "ingresses",
		"statefulset": "statefulsets",
		"daemonset":   "daemonsets",
		"job":         "jobs",
		"cronjob":     "cronjobs",
	}

	resource, ok := resourceMap[kind]
	if !ok {
		resource = kind + "s"
	}

	return gvk.GroupVersion().WithResource(resource), nil
}
