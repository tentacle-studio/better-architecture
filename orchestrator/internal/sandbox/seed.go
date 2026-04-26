package sandbox

import (
	"context"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
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
	decoder := k8syaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme)

	manifests := strings.Split(manifest, "---")

	for _, manifestDoc := range manifests {
		manifestDoc = strings.TrimSpace(manifestDoc)
		if manifestDoc == "" {
			continue
		}

		obj := &unstructured.Unstructured{}
		_, gvk, err := decoder.Decode([]byte(manifestDoc), nil, obj)
		if err != nil {
			return fmt.Errorf("failed to decode manifest: %w", err)
		}

		if obj.GetNamespace() == "" {
			obj.SetNamespace(namespace)
		}

		gvr := gvk.GroupVersion().WithResource(strings.ToLower(gvk.Kind) + "s")

		_, err = s.dynamicClient.Resource(gvr).Namespace(obj.GetNamespace()).Create(ctx, obj, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("failed to create resource %s/%s: %w", gvk.Kind, obj.GetName(), err)
		}
	}

	return nil
}
