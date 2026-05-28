package telemetry

import (
	"context"
	"net/http"
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var (
	meter = otel.Meter("orchestrator")

	SandboxProvisionDuration metric.Float64Histogram
	SandboxActiveCount       metric.Int64UpDownCounter
	metricsEnabled           bool

	prometheusRegistry  = prometheus.NewRegistry()
	registerMetricsOnce sync.Once

	promSandboxProvisionDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "orchestrator_sandbox_provision_duration_seconds",
			Help:    "Sandbox provisioning latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"quiz_id", "status"},
	)
	promSandboxActiveCount = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "orchestrator_sandbox_active",
			Help: "Current number of active sandboxes managed by the orchestrator",
		},
	)
)

func InitMetrics() error {
	var err error

	registerMetricsOnce.Do(func() {
		prometheusRegistry.MustRegister(prometheus.NewGoCollector())
		prometheusRegistry.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))
		prometheusRegistry.MustRegister(promSandboxProvisionDuration)
		prometheusRegistry.MustRegister(promSandboxActiveCount)
	})

	SandboxProvisionDuration, err = meter.Float64Histogram(
		"sandbox_provision_duration_s",
		metric.WithDescription("Sandbox provisioning latency in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return err
	}

	SandboxActiveCount, err = meter.Int64UpDownCounter(
		"sandbox_active_count",
		metric.WithDescription("Current number of active sandboxes"),
	)
	if err != nil {
		return err
	}

	metricsEnabled = true
	return nil
}

func MetricsHandler() http.Handler {
	return promhttp.HandlerFor(prometheusRegistry, promhttp.HandlerOpts{})
}

func RecordSandboxProvisionDuration(ctx context.Context, quizID, status string, seconds float64) {
	if !metricsEnabled {
		return
	}

	SandboxProvisionDuration.Record(ctx, seconds, metric.WithAttributes(
		attribute.String("quiz_id", quizID),
		attribute.String("status", status),
	))
	promSandboxProvisionDuration.WithLabelValues(quizID, status).Observe(seconds)
}

func AddSandboxActive(ctx context.Context, delta int64) {
	if !metricsEnabled {
		return
	}

	SandboxActiveCount.Add(ctx, delta)
	promSandboxActiveCount.Add(float64(delta))
}
