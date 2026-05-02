package workflow

import "time"

type SetupLabInput struct {
	UserID       string
	QuizID       string
	SeedManifest string
	TTL          time.Duration
}

type SetupLabOutput struct {
	SandboxID        string
	Kubeconfig       string
	VClusterEndpoint string
}

type SandboxInfo struct {
	SandboxID        string
	Namespace        string
	VClusterEndpoint string
	Kubeconfig       string
}

type CompensationInput struct {
	Namespace      string
	VClusterName   string
	SandboxID      string
	StepsCompleted []string
}

type ExpiredSession struct {
	ID        string
	SandboxID string
	Namespace string
}

type GradeCheck struct {
	Type     string
	SpecJSON string
}

type GradeLabInput struct {
	SandboxID        string
	QuizID           string
	Checks           []GradeCheck
	PassingThreshold float64
	BaseXP           int32
}

type GradeCheckResult struct {
	CheckName string
	Passed    bool
	Message   string
	Points    int32
}

type GradeLabOutput struct {
	Passed    bool
	Score     int32
	MaxScore  int32
	XPAwarded int32
	Results   []GradeCheckResult
}
