package judge

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
)

type SLAChecker struct {
	k8sClient     *k8s.Client
	prometheusURL string
}

type SLACheckSpec struct {
	Name              string  `json:"name"`
	MetricName        string  `json:"metric_name"`
	MaxLatencyMs      float64 `json:"max_latency_ms"`
	MinSuccessRate    float64 `json:"min_success_rate"`
	ObservationWindow int32   `json:"observation_window_seconds"`
	Points            int32   `json:"points"`
	Service           string  `json:"service"`
	Metric            string  `json:"metric"`
	Threshold         float64 `json:"threshold"`
	SampleDuration    int32   `json:"sample_duration_s"`
}

func NewSLAChecker(k8sClient *k8s.Client, prometheusURL string) *SLAChecker {
	return &SLAChecker{
		k8sClient:     k8sClient,
		prometheusURL: prometheusURL,
	}
}

func (c *SLAChecker) Check(ctx context.Context, sandboxID string, spec SLACheckSpec) (CheckResult, error) {
	result := CheckResult{
		CheckName: spec.Name,
		Points:    spec.Points,
	}

	if c.prometheusURL == "" {
		result.Message = "prometheus URL not configured, SLA check skipped"
		return result, nil
	}

	p95, found, err := c.queryP95Latency(ctx, sandboxID, spec)
	if err != nil {
		result.Message = fmt.Sprintf("failed to query metrics: %v", err)
		return result, nil
	}

	if !found {
		result.Message = "no metrics found for the given service and time window"
		return result, nil
	}

	threshold := spec.Threshold
	if threshold == 0 {
		threshold = spec.MaxLatencyMs
	}

	if p95 <= threshold {
		result.Passed = true
		result.Message = fmt.Sprintf("p95 latency %.2fms is within threshold %.2fms", p95, threshold)
	} else {
		result.Message = fmt.Sprintf("p95 latency %.2fms exceeds threshold %.2fms", p95, threshold)
	}

	return result, nil
}

type prometheusResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Value  []json.RawMessage `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

func (c *SLAChecker) queryP95Latency(ctx context.Context, sandboxID string, spec SLACheckSpec) (float64, bool, error) {
	service := spec.Service
	if service == "" {
		service = spec.MetricName
	}

	sampleDuration := spec.SampleDuration
	if sampleDuration == 0 {
		sampleDuration = spec.ObservationWindow
	}
	if sampleDuration == 0 {
		sampleDuration = 30
	}

	query := fmt.Sprintf(
		`histogram_quantile(0.95, rate(http_request_duration_ms_bucket{namespace=%q,service=%q}[%ds]))`,
		sandboxID, service, sampleDuration,
	)

	return c.queryPrometheus(ctx, query)
}

func (c *SLAChecker) queryPrometheus(ctx context.Context, query string) (float64, bool, error) {
	reqURL := fmt.Sprintf("%s/api/v1/query?query=%s",
		strings.TrimRight(c.prometheusURL, "/"),
		url.QueryEscape(query),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return 0, false, fmt.Errorf("create prometheus request: %w", err)
	}

	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return 0, false, fmt.Errorf("query prometheus: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, false, fmt.Errorf("read prometheus response: %w", err)
	}

	var promResp prometheusResponse
	if err := json.Unmarshal(body, &promResp); err != nil {
		return 0, false, fmt.Errorf("parse prometheus response: %w", err)
	}

	if promResp.Status != "success" {
		return 0, false, fmt.Errorf("prometheus query returned status: %s", promResp.Status)
	}

	if len(promResp.Data.Result) == 0 {
		return 0, false, nil
	}

	result := promResp.Data.Result[0]
	if len(result.Value) < 2 {
		return 0, false, fmt.Errorf("unexpected prometheus value format")
	}

	var valueStr string
	if err := json.Unmarshal(result.Value[1], &valueStr); err != nil {
		return 0, false, fmt.Errorf("parse prometheus value: %w", err)
	}

	value, err := strconv.ParseFloat(valueStr, 64)
	if err != nil {
		return 0, false, fmt.Errorf("convert prometheus value %q to float: %w", valueStr, err)
	}

	return value, true, nil
}

type OTelMetrics struct {
	AvgLatencyMs float64
	SuccessRate  float64
}

func (c *SLAChecker) meetsLatencySLA(metrics *OTelMetrics, maxLatency float64) bool {
	return metrics.AvgLatencyMs <= maxLatency
}

func (c *SLAChecker) meetsSuccessRateSLA(metrics *OTelMetrics, minSuccessRate float64) bool {
	return metrics.SuccessRate >= minSuccessRate
}
