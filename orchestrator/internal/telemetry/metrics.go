package telemetry

import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
)

var (
	meter = otel.Meter("orchestrator")

	SandboxesCreated  metric.Int64Counter
	SandboxesActive   metric.Int64UpDownCounter
	SandboxesFailed   metric.Int64Counter
	ValidationLatency metric.Float64Histogram
)

func InitMetrics() error {
	var err error

	SandboxesCreated, err = meter.Int64Counter(
		"sandboxes.created",
		metric.WithDescription("Total number of sandboxes created"),
	)
	if err != nil {
		return err
	}

	SandboxesActive, err = meter.Int64UpDownCounter(
		"sandboxes.active",
		metric.WithDescription("Current number of active sandboxes"),
	)
	if err != nil {
		return err
	}

	SandboxesFailed, err = meter.Int64Counter(
		"sandboxes.failed",
		metric.WithDescription("Total number of failed sandbox creations"),
	)
	if err != nil {
		return err
	}

	ValidationLatency, err = meter.Float64Histogram(
		"validation.latency",
		metric.WithDescription("Validation check latency in milliseconds"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return err
	}

	return nil
}
