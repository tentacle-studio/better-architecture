package judge

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"k8s.io/apiextensions-apiserver/examples/client-go/pkg/client/clientset/versioned/scheme"
	"k8s.io/client-go/tools/remotecommand"
)

type LivenessChecker struct {
	k8sClient *k8s.Client
}

type LivenessCheckSpec struct {
	Name          string `json:"name"`
	TargetService string `json:"target_service"`
	TargetPort    int32  `json:"target_port"`
	Namespace     string `json:"namespace"`
	Protocol      string `json:"protocol"`
	ExpectedCode  int32  `json:"expected_code"`
	Points        int32  `json:"points"`
}

func NewLivenessChecker(k8sClient *k8s.Client) *LivenessChecker {
	return &LivenessChecker{
		k8sClient: k8sClient,
	}
}

func (c *LivenessChecker) Check(ctx context.Context, sandboxID string, spec LivenessCheckSpec) (CheckResult, error) {
	result := CheckResult{
		CheckName: spec.Name,
		Points:    spec.Points,
		Passed:    false,
	}

	reachable, err := c.testConnectivity(ctx, spec)
	if err != nil {
		result.Message = fmt.Sprintf("Failed to test connectivity: %v", err)
		return result, nil
	}

	if reachable {
		result.Passed = true
		result.Message = "Service is reachable from tester pod"
	} else {
		result.Message = "Service is not reachable from tester pod"
	}

	return result, nil
}

func (c *LivenessChecker) testConnectivity(ctx context.Context, spec LivenessCheckSpec) (bool, error) {
	testerPodName := fmt.Sprintf("liveness-tester-%d", time.Now().Unix())
	namespace := spec.Namespace
	if namespace == "" {
		namespace = "default"
	}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      testerPodName,
			Namespace: namespace,
			Labels: map[string]string{
				"app":  "liveness-tester",
				"temp": "true",
			},
		},
		Spec: corev1.PodSpec{
			RestartPolicy: corev1.RestartPolicyNever,
			Containers: []corev1.Container{
				{
					Name:  "tester",
					Image: "curlimages/curl:latest",
					Command: []string{
						"sleep",
						"300",
					},
				},
			},
		},
	}

	_, err := c.k8sClient.Clientset.CoreV1().Pods(namespace).Create(ctx, pod, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("failed to create tester pod: %w", err)
	}

	defer func() {
		deleteCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = c.k8sClient.Clientset.CoreV1().Pods(namespace).Delete(deleteCtx, testerPodName, metav1.DeleteOptions{})
	}()

	if err := c.waitForPodReady(ctx, namespace, testerPodName, 60*time.Second); err != nil {
		return false, fmt.Errorf("tester pod not ready: %w", err)
	}

	targetURL := c.buildTargetURL(spec)
	curlCmd := []string{"curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "5", targetURL}

	stdout, stderr, err := c.execInPod(ctx, namespace, testerPodName, "tester", curlCmd)
	if err != nil {
		return false, fmt.Errorf("failed to exec curl in tester pod: %w (stderr: %s)", err, stderr)
	}

	httpCode := stdout
	if spec.ExpectedCode > 0 {
		expectedCode := fmt.Sprintf("%d", spec.ExpectedCode)
		return httpCode == expectedCode, nil
	}

	return httpCode == "200", nil
}

func (c *LivenessChecker) buildTargetURL(spec LivenessCheckSpec) string {
	protocol := spec.Protocol
	if protocol == "" {
		protocol = "http"
	}
	return fmt.Sprintf("%s://%s:%d", protocol, spec.TargetService, spec.TargetPort)
}

func (c *LivenessChecker) waitForPodReady(ctx context.Context, namespace, podName string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		pod, err := c.k8sClient.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
		if err != nil {
			return err
		}

		if pod.Status.Phase == corev1.PodRunning {
			for _, condition := range pod.Status.Conditions {
				if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
					return nil
				}
			}
		}

		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("pod %s not ready within timeout", podName)
}

func (c *LivenessChecker) execInPod(ctx context.Context, namespace, podName, containerName string, command []string) (string, string, error) {
	req := c.k8sClient.Clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: containerName,
			Command:   command,
			Stdout:    true,
			Stderr:    true,
		}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(c.k8sClient.Config, "POST", req.URL())
	if err != nil {
		return "", "", fmt.Errorf("failed to create executor: %w", err)
	}

	var stdout, stderr bytes.Buffer
	err = exec.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdout: &stdout,
		Stderr: &stderr,
	})

	return stdout.String(), stderr.String(), err
}
