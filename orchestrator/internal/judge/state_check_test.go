package judge

import (
	"context"
	"testing"
)

func TestStateChecker_GetGVR(t *testing.T) {
	checker := &StateChecker{}

	tests := []struct {
		name         string
		resourceType string
		wantErr      bool
	}{
		{
			name:         "pod resource",
			resourceType: "pod",
			wantErr:      false,
		},
		{
			name:         "deployment resource",
			resourceType: "deployment",
			wantErr:      false,
		},
		{
			name:         "service resource",
			resourceType: "service",
			wantErr:      false,
		},
		{
			name:         "unsupported resource",
			resourceType: "unknown",
			wantErr:      true,
		},
		{
			name:         "case insensitive",
			resourceType: "POD",
			wantErr:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gvr, err := checker.getGVR(tt.resourceType)
			if (err != nil) != tt.wantErr {
				t.Errorf("getGVR() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && gvr.Resource == "" {
				t.Errorf("getGVR() returned empty resource")
			}
		})
	}
}

func TestStateChecker_MatchesExpectedState(t *testing.T) {
	checker := &StateChecker{}

	tests := []struct {
		name     string
		actual   map[string]string
		expected map[string]string
		want     bool
	}{
		{
			name: "exact match",
			actual: map[string]string{
				"phase":    "Running",
				"replicas": "3",
			},
			expected: map[string]string{
				"phase":    "Running",
				"replicas": "3",
			},
			want: true,
		},
		{
			name: "partial match - expected subset of actual",
			actual: map[string]string{
				"phase":          "Running",
				"replicas":       "3",
				"readyReplicas":  "3",
			},
			expected: map[string]string{
				"phase":    "Running",
				"replicas": "3",
			},
			want: true,
		},
		{
			name: "mismatch value",
			actual: map[string]string{
				"phase":    "Pending",
				"replicas": "3",
			},
			expected: map[string]string{
				"phase":    "Running",
				"replicas": "3",
			},
			want: false,
		},
		{
			name: "missing key",
			actual: map[string]string{
				"phase": "Running",
			},
			expected: map[string]string{
				"phase":    "Running",
				"replicas": "3",
			},
			want: false,
		},
		{
			name:     "empty expected",
			actual:   map[string]string{"phase": "Running"},
			expected: map[string]string{},
			want:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checker.matchesExpectedState(tt.actual, tt.expected)
			if got != tt.want {
				t.Errorf("matchesExpectedState() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestStateChecker_Check(t *testing.T) {
	tests := []struct {
		name      string
		spec      StateCheckSpec
		wantError bool
	}{
		{
			name: "valid spec",
			spec: StateCheckSpec{
				Name:         "test-check",
				ResourceType: "deployment",
				ResourceName: "test-deployment",
				Namespace:    "default",
				ExpectedState: map[string]string{
					"replicas": "3",
				},
				Points: 10,
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := &StateChecker{}
			ctx := context.Background()
			
			result, err := checker.Check(ctx, "test-sandbox", tt.spec)
			
			if tt.wantError && err == nil {
				t.Error("Check() expected error but got none")
			}
			if !tt.wantError && result.CheckName != tt.spec.Name {
				t.Errorf("Check() result.CheckName = %v, want %v", result.CheckName, tt.spec.Name)
			}
			if !tt.wantError && result.Points != tt.spec.Points {
				t.Errorf("Check() result.Points = %v, want %v", result.Points, tt.spec.Points)
			}
		})
	}
}
