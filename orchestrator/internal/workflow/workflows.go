package workflow

import (
	"fmt"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

const (
	SetupLabWorkflowName       = "SetupLabEnvironment"
	CompensationWorkflowName   = "CompensationWorkflow"
	CleanupExpiredWorkflowName = "CleanupExpiredSandboxes"
	GradeLabWorkflowName       = "GradeLab"
)

func SetupLabEnvironment(ctx workflow.Context, input SetupLabInput) (*SetupLabOutput, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting SetupLabEnvironment workflow", "userID", input.UserID, "quizID", input.QuizID)

	retryPolicy := &temporal.RetryPolicy{
		InitialInterval:    5 * time.Second,
		BackoffCoefficient: 2.0,
		MaximumInterval:    60 * time.Second,
		MaximumAttempts:    3,
	}

	compensationInput := CompensationInput{
		StepsCompleted: []string{},
	}

	defer func() {
		if r := recover(); r != nil {
			logger.Error("Workflow panicked, running compensation", "error", r)
			_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		}
	}()

	var namespace string
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
		RetryPolicy:         retryPolicy,
	}
	ctx1 := workflow.WithActivityOptions(ctx, activityOptions)

	err := workflow.ExecuteActivity(ctx1, "CreateNamespace", input.UserID, input.QuizID).Get(ctx1, &namespace)
	if err != nil {
		logger.Error("Failed to create namespace", "error", err)
		return nil, fmt.Errorf("create namespace: %w", err)
	}
	compensationInput.Namespace = namespace
	compensationInput.StepsCompleted = append(compensationInput.StepsCompleted, "namespace")

	var vclusterName string
	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 7 * time.Minute,  // Increased to accommodate 5min Helm timeout + buffer
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    10 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    60 * time.Second,
			MaximumAttempts:    2,
		},
		// No HeartbeatTimeout - Helm operations don't send heartbeats
	}
	ctx2 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx2, "DeployVCluster", namespace).Get(ctx2, &vclusterName)
	if err != nil {
		logger.Error("Failed to deploy vcluster", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("deploy vcluster: %w", err)
	}
	compensationInput.VClusterName = vclusterName
	compensationInput.StepsCompleted = append(compensationInput.StepsCompleted, "vcluster")

	var vclusterEndpoint string
	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 90 * time.Second,
		RetryPolicy:         retryPolicy,
		HeartbeatTimeout:    10 * time.Second,
	}
	ctx3 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx3, "WaitUntilReady", namespace, vclusterName).Get(ctx3, &vclusterEndpoint)
	if err != nil {
		logger.Error("VCluster failed to become ready", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("wait until ready: %w", err)
	}

	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 15 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    2 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    3,
		},
	}
	ctx4 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx4, "ApplyNetworkPolicies", namespace).Get(ctx4, nil)
	if err != nil {
		logger.Error("Failed to apply network policies", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("apply network policies: %w", err)
	}

	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 60 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    60 * time.Second,
			MaximumAttempts:    2,
		},
	}
	ctx5 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx5, "InitializeSeedData", namespace, vclusterName, input.SeedManifest).Get(ctx5, nil)
	if err != nil {
		logger.Error("Failed to initialize seed data", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("initialize seed data: %w", err)
	}

	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 45 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    3,
		},
	}
	ctx6 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx6, "SetupShellPod", namespace, vclusterName).Get(ctx6, nil)
	if err != nil {
		logger.Error("Failed to setup shell pod", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("setup shell pod: %w", err)
	}

	var sandboxInfo *SandboxInfo
	activityOptions = workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    3 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    3,
		},
	}
	ctx7 := workflow.WithActivityOptions(ctx, activityOptions)

	err = workflow.ExecuteActivity(ctx7, "VerifyReady", vclusterEndpoint, namespace, vclusterName).Get(ctx7, &sandboxInfo)
	if err != nil {
		logger.Error("Failed to verify sandbox ready", "error", err)
		_ = workflow.ExecuteChildWorkflow(ctx, CompensationWorkflow, compensationInput).Get(ctx, nil)
		return nil, fmt.Errorf("verify ready: %w", err)
	}

	output := &SetupLabOutput{
		SandboxID:        sandboxInfo.SandboxID,
		Kubeconfig:       sandboxInfo.Kubeconfig,
		VClusterEndpoint: sandboxInfo.VClusterEndpoint,
	}

	logger.Info("SetupLabEnvironment workflow completed successfully", "sandboxID", output.SandboxID)
	return output, nil
}

func CompensationWorkflow(ctx workflow.Context, input CompensationInput) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting CompensationWorkflow", "namespace", input.Namespace)

	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 60 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 1.5,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    1,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	for _, step := range input.StepsCompleted {
		switch step {
		case "vcluster":
			err := workflow.ExecuteActivity(ctx, "DeleteVCluster", input.Namespace, input.VClusterName).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to delete vcluster during compensation", "error", err)
			}
		}
	}

	if input.Namespace != "" {
		err := workflow.ExecuteActivity(ctx, "DeleteNamespace", input.Namespace).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to delete namespace during compensation", "error", err)
		}
	}

	if input.SandboxID != "" {
		_ = workflow.ExecuteActivity(ctx, "CleanupNATSSubjects", input.SandboxID).Get(ctx, nil)
		_ = workflow.ExecuteActivity(ctx, "UpdateSessionStatus", input.SandboxID, "FAILED").Get(ctx, nil)
	}

	logger.Info("CompensationWorkflow completed")
	return nil
}

func GradeLabWorkflow(ctx workflow.Context, input GradeLabInput) (*GradeLabOutput, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting GradeLabWorkflow", "sandboxID", input.SandboxID, "quizID", input.QuizID)

	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    2,
		},
		HeartbeatTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	var output *GradeLabOutput
	if err := workflow.ExecuteActivity(ctx, "RunValidation", input).Get(ctx, &output); err != nil {
		logger.Error("Validation activity failed", "error", err)
		return nil, fmt.Errorf("run validation: %w", err)
	}

	logger.Info("GradeLabWorkflow completed",
		"sandboxID", input.SandboxID,
		"passed", output.Passed,
		"score", output.Score,
		"maxScore", output.MaxScore,
		"xpAwarded", output.XPAwarded,
	)
	return output, nil
}

func CleanupExpiredSandboxes(ctx workflow.Context, ttlThreshold time.Duration) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting CleanupExpiredSandboxes workflow", "ttlThreshold", ttlThreshold)

	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 60 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    60 * time.Second,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	var expiredSessions []ExpiredSession
	err := workflow.ExecuteActivity(ctx, "ListExpiredSessions", ttlThreshold).Get(ctx, &expiredSessions)
	if err != nil {
		logger.Error("Failed to list expired sessions", "error", err)
		return fmt.Errorf("list expired sessions: %w", err)
	}

	logger.Info("Found expired sessions", "count", len(expiredSessions))

	for _, session := range expiredSessions {
		err := workflow.ExecuteActivity(ctx, "DestroySandbox", session.SandboxID, session.Namespace).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to destroy sandbox", "sandboxID", session.SandboxID, "error", err)
			continue
		}

		err = workflow.ExecuteActivity(ctx, "MarkSessionCleaned", session.ID).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to mark session as cleaned", "sessionID", session.ID, "error", err)
		}
	}

	logger.Info("CleanupExpiredSandboxes workflow completed", "cleaned", len(expiredSessions))
	return nil
}
