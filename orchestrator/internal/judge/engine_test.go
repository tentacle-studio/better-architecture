package judge

import (
	"context"
	"encoding/json"
	"testing"
)

func TestEngine_Validate(t *testing.T) {
	tests := []struct {
		name      string
		checks    []Check
		wantError bool
	}{
		{
			name: "empty checks",
			checks: []Check{},
			wantError: false,
		},
		{
			name: "unknown check type",
			checks: []Check{
				{
					Type:     "UNKNOWN",
					SpecJSON: "{}",
				},
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine := &Engine{}
			ctx := context.Background()
			
			result, err := engine.Validate(ctx, "test-sandbox", "test-quiz", tt.checks)
			
			if tt.wantError && err == nil {
				t.Error("Validate() expected error but got none")
			}
			if !tt.wantError && err != nil {
				t.Errorf("Validate() unexpected error: %v", err)
			}
			if !tt.wantError && result == nil {
				t.Error("Validate() returned nil result")
			}
		})
	}
}

func TestCheckType_Constants(t *testing.T) {
	tests := []struct {
		name      string
		checkType CheckType
		want      string
	}{
		{
			name:      "state check type",
			checkType: CheckTypeState,
			want:      "STATE",
		},
		{
			name:      "liveness check type",
			checkType: CheckTypeLiveness,
			want:      "LIVENESS",
		},
		{
			name:      "sla check type",
			checkType: CheckTypeSLA,
			want:      "SLA",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.checkType) != tt.want {
				t.Errorf("CheckType = %v, want %v", tt.checkType, tt.want)
			}
		})
	}
}

func TestValidationResult_Scoring(t *testing.T) {
	result := &ValidationResult{
		Passed:  true,
		Results: []CheckResult{
			{
				CheckName: "check1",
				Passed:    true,
				Points:    10,
			},
			{
				CheckName: "check2",
				Passed:    true,
				Points:    15,
			},
		},
		Score: 25,
	}

	if result.Score != 25 {
		t.Errorf("ValidationResult.Score = %v, want 25", result.Score)
	}
	if !result.Passed {
		t.Error("ValidationResult.Passed should be true")
	}
	if len(result.Results) != 2 {
		t.Errorf("ValidationResult.Results length = %v, want 2", len(result.Results))
	}
}

func TestCheckSpec_JSONMarshaling(t *testing.T) {
	t.Run("StateCheckSpec", func(t *testing.T) {
		spec := StateCheckSpec{
			Name:         "test-state",
			ResourceType: "deployment",
			ResourceName: "my-app",
			Namespace:    "default",
			ExpectedState: map[string]string{
				"replicas": "3",
			},
			Points: 10,
		}

		jsonData, err := json.Marshal(spec)
		if err != nil {
			t.Fatalf("Failed to marshal StateCheckSpec: %v", err)
		}

		var unmarshaled StateCheckSpec
		err = json.Unmarshal(jsonData, &unmarshaled)
		if err != nil {
			t.Fatalf("Failed to unmarshal StateCheckSpec: %v", err)
		}

		if unmarshaled.Name != spec.Name {
			t.Errorf("Unmarshaled Name = %v, want %v", unmarshaled.Name, spec.Name)
		}
		if unmarshaled.Points != spec.Points {
			t.Errorf("Unmarshaled Points = %v, want %v", unmarshaled.Points, spec.Points)
		}
	})

	t.Run("LivenessCheckSpec", func(t *testing.T) {
		spec := LivenessCheckSpec{
			Name:          "test-liveness",
			TargetService: "my-service",
			TargetPort:    8080,
			Namespace:     "default",
			Protocol:      "http",
			ExpectedCode:  200,
			Points:        15,
		}

		jsonData, err := json.Marshal(spec)
		if err != nil {
			t.Fatalf("Failed to marshal LivenessCheckSpec: %v", err)
		}

		var unmarshaled LivenessCheckSpec
		err = json.Unmarshal(jsonData, &unmarshaled)
		if err != nil {
			t.Fatalf("Failed to unmarshal LivenessCheckSpec: %v", err)
		}

		if unmarshaled.Name != spec.Name {
			t.Errorf("Unmarshaled Name = %v, want %v", unmarshaled.Name, spec.Name)
		}
		if unmarshaled.TargetPort != spec.TargetPort {
			t.Errorf("Unmarshaled TargetPort = %v, want %v", unmarshaled.TargetPort, spec.TargetPort)
		}
	})

	t.Run("SLACheckSpec", func(t *testing.T) {
		spec := SLACheckSpec{
			Name:              "test-sla",
			MetricName:        "api-latency",
			MaxLatencyMs:      100.0,
			MinSuccessRate:    0.95,
			ObservationWindow: 60,
			Points:            20,
		}

		jsonData, err := json.Marshal(spec)
		if err != nil {
			t.Fatalf("Failed to marshal SLACheckSpec: %v", err)
		}

		var unmarshaled SLACheckSpec
		err = json.Unmarshal(jsonData, &unmarshaled)
		if err != nil {
			t.Fatalf("Failed to unmarshal SLACheckSpec: %v", err)
		}

		if unmarshaled.Name != spec.Name {
			t.Errorf("Unmarshaled Name = %v, want %v", unmarshaled.Name, spec.Name)
		}
		if unmarshaled.MaxLatencyMs != spec.MaxLatencyMs {
			t.Errorf("Unmarshaled MaxLatencyMs = %v, want %v", unmarshaled.MaxLatencyMs, spec.MaxLatencyMs)
		}
	})
}
