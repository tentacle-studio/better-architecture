package judge

import (
	"context"
	"testing"
)

func TestSLAChecker_MeetsLatencySLA(t *testing.T) {
	checker := &SLAChecker{}

	tests := []struct {
		name       string
		metrics    *OTelMetrics
		maxLatency float64
		want       bool
	}{
		{
			name: "meets latency requirement",
			metrics: &OTelMetrics{
				AvgLatencyMs: 50.0,
				SuccessRate:  0.99,
			},
			maxLatency: 100.0,
			want:       true,
		},
		{
			name: "exceeds latency requirement",
			metrics: &OTelMetrics{
				AvgLatencyMs: 150.0,
				SuccessRate:  0.99,
			},
			maxLatency: 100.0,
			want:       false,
		},
		{
			name: "exactly at threshold",
			metrics: &OTelMetrics{
				AvgLatencyMs: 100.0,
				SuccessRate:  0.99,
			},
			maxLatency: 100.0,
			want:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checker.meetsLatencySLA(tt.metrics, tt.maxLatency)
			if got != tt.want {
				t.Errorf("meetsLatencySLA() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSLAChecker_MeetsSuccessRateSLA(t *testing.T) {
	checker := &SLAChecker{}

	tests := []struct {
		name           string
		metrics        *OTelMetrics
		minSuccessRate float64
		want           bool
	}{
		{
			name: "meets success rate requirement",
			metrics: &OTelMetrics{
				AvgLatencyMs: 50.0,
				SuccessRate:  0.99,
			},
			minSuccessRate: 0.95,
			want:           true,
		},
		{
			name: "below success rate requirement",
			metrics: &OTelMetrics{
				AvgLatencyMs: 50.0,
				SuccessRate:  0.90,
			},
			minSuccessRate: 0.95,
			want:           false,
		},
		{
			name: "exactly at threshold",
			metrics: &OTelMetrics{
				AvgLatencyMs: 50.0,
				SuccessRate:  0.95,
			},
			minSuccessRate: 0.95,
			want:           true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checker.meetsSuccessRateSLA(tt.metrics, tt.minSuccessRate)
			if got != tt.want {
				t.Errorf("meetsSuccessRateSLA() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSLAChecker_Check(t *testing.T) {
	tests := []struct {
		name      string
		spec      SLACheckSpec
		wantError bool
	}{
		{
			name: "valid spec",
			spec: SLACheckSpec{
				Name:              "test-sla",
				MetricName:        "api-latency",
				MaxLatencyMs:      100.0,
				MinSuccessRate:    0.95,
				ObservationWindow: 60,
				Points:            20,
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := &SLAChecker{}
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
