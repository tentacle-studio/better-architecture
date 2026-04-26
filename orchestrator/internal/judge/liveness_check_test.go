package judge

import (
	"context"
	"testing"
)

func TestLivenessChecker_BuildTargetURL(t *testing.T) {
	checker := &LivenessChecker{}

	tests := []struct {
		name string
		spec LivenessCheckSpec
		want string
	}{
		{
			name: "http default",
			spec: LivenessCheckSpec{
				TargetService: "my-service",
				TargetPort:    8080,
				Protocol:      "",
			},
			want: "http://my-service:8080",
		},
		{
			name: "https explicit",
			spec: LivenessCheckSpec{
				TargetService: "my-service",
				TargetPort:    443,
				Protocol:      "https",
			},
			want: "https://my-service:443",
		},
		{
			name: "custom port",
			spec: LivenessCheckSpec{
				TargetService: "api-service",
				TargetPort:    3000,
				Protocol:      "http",
			},
			want: "http://api-service:3000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checker.buildTargetURL(tt.spec)
			if got != tt.want {
				t.Errorf("buildTargetURL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestLivenessChecker_Check(t *testing.T) {
	tests := []struct {
		name      string
		spec      LivenessCheckSpec
		wantError bool
	}{
		{
			name: "valid spec",
			spec: LivenessCheckSpec{
				Name:          "test-liveness",
				TargetService: "test-service",
				TargetPort:    8080,
				Namespace:     "default",
				Protocol:      "http",
				ExpectedCode:  200,
				Points:        15,
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := &LivenessChecker{}
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
