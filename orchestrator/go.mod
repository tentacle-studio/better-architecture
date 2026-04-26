module github.com/tentacle-studio/better-architecture/orchestrator

go 1.22

require (
	github.com/google/uuid v1.5.0
	github.com/nats-io/nats.go v1.31.0
	go.opentelemetry.io/otel v1.21.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.21.0
	go.opentelemetry.io/otel/sdk v1.21.0
	go.opentelemetry.io/otel/trace v1.21.0
	google.golang.org/grpc v1.60.1
	google.golang.org/protobuf v1.31.0
	helm.sh/helm/v3 v3.13.0
	k8s.io/api v0.29.0
	k8s.io/apimachinery v0.29.0
	k8s.io/client-go v0.29.0
	sigs.k8s.io/controller-runtime v0.17.0
	sigs.k8s.io/yaml v1.4.0
)
