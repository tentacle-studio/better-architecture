package workflow

import (
	"context"
	"fmt"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

const (
	DefaultTaskQueue = "lab-provisioning"
)

type WorkerConfig struct {
	TemporalHost         string
	TemporalNamespace    string
	TaskQueue            string
	K8sClient            *k8s.Client
	TesterPodCIDR        string
	VClusterChartRepo    string
	VClusterChartVersion string
	PrometheusURL        string
}

type Worker struct {
	client     client.Client
	worker     worker.Worker
	activities *Activities
}

func NewWorker(config WorkerConfig) (*Worker, error) {
	temporalClient, err := client.Dial(client.Options{
		HostPort:  config.TemporalHost,
		Namespace: config.TemporalNamespace,
	})
	if err != nil {
		return nil, fmt.Errorf("create temporal client: %w", err)
	}

	taskQueue := config.TaskQueue
	if taskQueue == "" {
		taskQueue = DefaultTaskQueue
	}

	w := worker.New(temporalClient, taskQueue, worker.Options{})

	activities := NewActivities(
		config.K8sClient,
		config.TesterPodCIDR,
		config.VClusterChartRepo,
		config.VClusterChartVersion,
	).WithJudgeEngine(judge.NewEngine(
		config.K8sClient,
		judge.WithPrometheusURL(config.PrometheusURL),
	))

	w.RegisterWorkflow(SetupLabEnvironment)
	w.RegisterWorkflow(CompensationWorkflow)
	w.RegisterWorkflow(CleanupExpiredSandboxes)
	w.RegisterWorkflow(GradeLabWorkflow)

	w.RegisterActivity(activities.CreateNamespace)
	w.RegisterActivity(activities.DeployVCluster)
	w.RegisterActivity(activities.WaitUntilReady)
	w.RegisterActivity(activities.ApplyNetworkPolicies)
	w.RegisterActivity(activities.InitializeSeedData)
	w.RegisterActivity(activities.VerifyReady)
	w.RegisterActivity(activities.DeleteVCluster)
	w.RegisterActivity(activities.DeleteNamespace)
	w.RegisterActivity(activities.CleanupNATSSubjects)
	w.RegisterActivity(activities.UpdateSessionStatus)
	w.RegisterActivity(activities.ListExpiredSessions)
	w.RegisterActivity(activities.DestroySandbox)
	w.RegisterActivity(activities.MarkSessionCleaned)
	w.RegisterActivity(activities.RunValidation)

	return &Worker{
		client:     temporalClient,
		worker:     w,
		activities: activities,
	}, nil
}

func (w *Worker) Start() error {
	return w.worker.Start()
}

func (w *Worker) Stop() {
	w.worker.Stop()
	w.client.Close()
}

func (w *Worker) GetClient() client.Client {
	return w.client
}

func StartCleanupSchedule(ctx context.Context, temporalClient client.Client, ttlThreshold time.Duration) error {
	scheduleClient := temporalClient.ScheduleClient()

	scheduleID := "cleanup-expired-sandboxes"
	schedule, err := scheduleClient.Create(ctx, client.ScheduleOptions{
		ID: scheduleID,
		Spec: client.ScheduleSpec{
			CronExpressions: []string{"*/5 * * * *"},
		},
		Action: &client.ScheduleWorkflowAction{
			ID:        CleanupExpiredWorkflowName,
			Workflow:  CleanupExpiredSandboxes,
			Args:      []interface{}{ttlThreshold},
			TaskQueue: DefaultTaskQueue,
		},
	})
	if err != nil {
		return fmt.Errorf("create cleanup schedule: %w", err)
	}

	fmt.Printf("Created cleanup schedule: %s\n", schedule.GetID())
	return nil
}
