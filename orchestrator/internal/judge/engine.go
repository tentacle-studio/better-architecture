package judge

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
)

type Engine struct {
	k8sClient *k8s.Client
}

type CheckType string

const (
	CheckTypeState    CheckType = "STATE"
	CheckTypeLiveness CheckType = "LIVENESS"
	CheckTypeSLA      CheckType = "SLA"
)

type Check struct {
	Type     CheckType
	SpecJSON string
}

type CheckResult struct {
	CheckName string
	Passed    bool
	Message   string
	Points    int32
}

type ValidationResult struct {
	Passed  bool
	Results []CheckResult
	Score   int32
}

func NewEngine(k8sClient *k8s.Client) *Engine {
	return &Engine{
		k8sClient: k8sClient,
	}
}

func (e *Engine) Validate(ctx context.Context, sandboxID, quizID string, checks []Check) (*ValidationResult, error) {
	result := &ValidationResult{
		Passed:  true,
		Results: make([]CheckResult, 0, len(checks)),
		Score:   0,
	}

	for _, check := range checks {
		var checkResult CheckResult
		var err error

		switch check.Type {
		case CheckTypeState:
			checkResult, err = e.runStateCheck(ctx, sandboxID, check.SpecJSON)
		case CheckTypeLiveness:
			checkResult, err = e.runLivenessCheck(ctx, sandboxID, check.SpecJSON)
		case CheckTypeSLA:
			checkResult, err = e.runSLACheck(ctx, sandboxID, check.SpecJSON)
		default:
			return nil, fmt.Errorf("unknown check type: %s", check.Type)
		}

		if err != nil {
			return nil, fmt.Errorf("failed to run check %s: %w", check.Type, err)
		}

		result.Results = append(result.Results, checkResult)
		if checkResult.Passed {
			result.Score += checkResult.Points
		} else {
			result.Passed = false
		}
	}

	return result, nil
}

func (e *Engine) runStateCheck(ctx context.Context, sandboxID, specJSON string) (CheckResult, error) {
	var spec StateCheckSpec
	if err := json.Unmarshal([]byte(specJSON), &spec); err != nil {
		return CheckResult{}, fmt.Errorf("failed to unmarshal state check spec: %w", err)
	}

	checker := NewStateChecker(e.k8sClient)
	return checker.Check(ctx, sandboxID, spec)
}

func (e *Engine) runLivenessCheck(ctx context.Context, sandboxID, specJSON string) (CheckResult, error) {
	var spec LivenessCheckSpec
	if err := json.Unmarshal([]byte(specJSON), &spec); err != nil {
		return CheckResult{}, fmt.Errorf("failed to unmarshal liveness check spec: %w", err)
	}

	checker := NewLivenessChecker(e.k8sClient)
	return checker.Check(ctx, sandboxID, spec)
}

func (e *Engine) runSLACheck(ctx context.Context, sandboxID, specJSON string) (CheckResult, error) {
	var spec SLACheckSpec
	if err := json.Unmarshal([]byte(specJSON), &spec); err != nil {
		return CheckResult{}, fmt.Errorf("failed to unmarshal SLA check spec: %w", err)
	}

	checker := NewSLAChecker(e.k8sClient)
	return checker.Check(ctx, sandboxID, spec)
}
