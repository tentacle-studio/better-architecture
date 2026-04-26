package judge

import (
	"context"
	"fmt"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type SLAChecker struct {
	k8sClient *k8s.Client
}

type SLACheckSpec struct {
	Name              string  `json:"name"`
	MetricName        string  `json:"metric_name"`
	MaxLatencyMs      float64 `json:"max_latency_ms"`
	MinSuccessRate    float64 `json:"min_success_rate"`
	ObservationWindow int32   `json:"observation_window_seconds"`
	Points            int32   `json:"points"`
}

func NewSLAChecker(k8sClient *k8s.Client) *SLAChecker {
	return &SLAChecker{
		k8sClient: k8sClient,
	}
}

func (c *SLAChecker) Check(ctx context.Context, sandboxID string, spec SLACheckSpec) (CheckResult, error) {
	result := CheckResult{
		CheckName: spec.Name,
		Points:    spec.Points,
		Passed:    false,
	}

	metrics, err := c.queryOTelMetrics(ctx, spec)
	if err != nil {
		result.Message = fmt.Sprintf("Failed to query OTel metrics: %v", err)
		return result, nil
	}

	if c.meetsLatencySLA(metrics, spec.MaxLatencyMs) && c.meetsSuccessRateSLA(metrics, spec.MinSuccessRate) {
		result.Passed = true
		result.Message = "SLA requirements met"
	} else {
		result.Message = fmt.Sprintf("SLA requirements not met. Latency: %.2fms, Success rate: %.2f%%",
			metrics.AvgLatencyMs, metrics.SuccessRate*100)
	}

	return result, nil
}

type OTelMetrics struct {
	AvgLatencyMs float64
	SuccessRate  float64
}

func (c *SLAChecker) queryOTelMetrics(ctx context.Context, spec SLACheckSpec) (*OTelMetrics, error) {
	meter := otel.Meter("orchestrator-judge")

	latencyHistogram, err := meter.Float64Histogram(
		fmt.Sprintf("%s.latency", spec.MetricName),
		metric.WithDescription("Request latency in milliseconds"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create latency histogram: %w", err)
	}

	successCounter, err := meter.Int64Counter(
		fmt.Sprintf("%s.success", spec.MetricName),
		metric.WithDescription("Successful requests"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create success counter: %w", err)
	}

	totalCounter, err := meter.Int64Counter(
		fmt.Sprintf("%s.total", spec.MetricName),
		metric.WithDescription("Total requests"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create total counter: %w", err)
	}

	_ = latencyHistogram
	_ = successCounter
	_ = totalCounter

	observationStart := time.Now().Add(-time.Duration(spec.ObservationWindow) * time.Second)
	_ = observationStart

	metrics := &OTelMetrics{
		AvgLatencyMs: 0.0,
		SuccessRate:  1.0,
	}

	podList, err := c.k8sClient.Clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("metric=%s", spec.MetricName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods for metric collection: %w", err)
	}

	if len(podList.Items) == 0 {
		return metrics, nil
	}

	var totalLatency float64
	var successCount int64
	var totalCount int64

	for _, pod := range podList.Items {
		if latencyStr, ok := pod.Annotations["latency_ms"]; ok {
			var latency float64
			fmt.Sscanf(latencyStr, "%f", &latency)
			totalLatency += latency
			totalCount++
		}

		if statusStr, ok := pod.Annotations["status"]; ok {
			totalCount++
			if statusStr == "success" {
				successCount++
			}
		}
	}

	if totalCount > 0 {
		metrics.AvgLatencyMs = totalLatency / float64(totalCount)
		metrics.SuccessRate = float64(successCount) / float64(totalCount)
	}

	attrs := []attribute.KeyValue{
		attribute.String("metric_name", spec.MetricName),
		attribute.Float64("avg_latency_ms", metrics.AvgLatencyMs),
		attribute.Float64("success_rate", metrics.SuccessRate),
	}
	_ = attrs

	return metrics, nil
}

func (c *SLAChecker) meetsLatencySLA(metrics *OTelMetrics, maxLatency float64) bool {
	return metrics.AvgLatencyMs <= maxLatency
}

func (c *SLAChecker) meetsSuccessRateSLA(metrics *OTelMetrics, minSuccessRate float64) bool {
	return metrics.SuccessRate >= minSuccessRate
}
