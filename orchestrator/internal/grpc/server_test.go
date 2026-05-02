package grpc

import (
	"testing"

	"k8s.io/apimachinery/pkg/runtime"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

func TestServer_ExtractStatus(t *testing.T) {
	server := &Server{}

	tests := []struct {
		name   string
		obj    runtime.Object
		kind   string
		want   string
	}{
		{
			name: "running pod",
			obj: &corev1.Pod{
				Status: corev1.PodStatus{
					Phase: corev1.PodRunning,
				},
			},
			kind: "Pod",
			want: "Running",
		},
		{
			name: "pending pod",
			obj: &corev1.Pod{
				Status: corev1.PodStatus{
					Phase: corev1.PodPending,
				},
			},
			kind: "Pod",
			want: "Pending",
		},
		{
			name: "service",
			obj:  &corev1.Service{},
			kind: "Service",
			want: "Active",
		},
		{
			name: "ready deployment",
			obj: &appsv1.Deployment{
				Status: appsv1.DeploymentStatus{
					Replicas:      3,
					ReadyReplicas: 3,
				},
			},
			kind: "Deployment",
			want: "Ready",
		},
		{
			name: "progressing deployment",
			obj: &appsv1.Deployment{
				Status: appsv1.DeploymentStatus{
					Replicas:      3,
					ReadyReplicas: 1,
				},
			},
			kind: "Deployment",
			want: "Progressing",
		},
		{
			name: "unknown type",
			obj:  &corev1.ConfigMap{},
			kind: "ConfigMap",
			want: "Unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := server.extractStatus(tt.obj, tt.kind)
			if got != tt.want {
				t.Errorf("extractStatus() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestServer_NewServer(t *testing.T) {
	server := NewServer(nil, nil)
	if server == nil {
		t.Error("NewServer() returned nil")
	}
	if server.sandboxManager != nil {
		t.Error("Expected nil sandboxManager")
	}
	if server.judgeEngine != nil {
		t.Error("Expected nil judgeEngine")
	}
}
