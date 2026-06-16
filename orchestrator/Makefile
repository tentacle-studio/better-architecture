.PHONY: all proto build run clean docker-build helm-install helm-upgrade helm-uninstall test deps install-tools temporal-up temporal-down worker help

BINARY_NAME=orchestrator
WORKER_BINARY=temporal-worker
DOCKER_IMAGE=orchestrator:latest
HELM_CHART=deploy/helm/orchestrator

all: proto build

proto:
	@echo "Generating protobuf code..."
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		internal/grpc/proto/orchestrator.proto

build:
	@echo "Building $(BINARY_NAME)..."
	go build -o bin/$(BINARY_NAME) ./cmd/orchestrator

run: build
	@echo "Running $(BINARY_NAME)..."
	@if [ -z "$$KUBECONFIG" ]; then \
		export KUBECONFIG=$$HOME/.kube/config; \
	fi; \
	./bin/$(BINARY_NAME)

clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f internal/grpc/proto/*.pb.go

docker-build:
	@echo "Building Docker image..."
	docker build -f deploy/Dockerfile -t $(DOCKER_IMAGE) .

helm-install:
	@echo "Installing Helm chart..."
	helm install orchestrator $(HELM_CHART) \
		--namespace orchestrator-system \
		--create-namespace

helm-upgrade:
	@echo "Upgrading Helm chart..."
	helm upgrade orchestrator $(HELM_CHART) \
		--namespace orchestrator-system

helm-uninstall:
	@echo "Uninstalling Helm chart..."
	helm uninstall orchestrator --namespace orchestrator-system

test:
	@echo "Running tests..."
	go test -v ./...

deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy

install-tools:
	@echo "Installing protoc plugins..."
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

temporal-up:
	@echo "Starting Temporal server..."
	docker-compose -f docker-compose.temporal.yml up -d
	@echo "Temporal UI available at http://localhost:8080"

temporal-down:
	@echo "Stopping Temporal server..."
	docker-compose -f docker-compose.temporal.yml down

worker:
	@echo "Building Temporal worker..."
	go build -o bin/$(WORKER_BINARY) ./cmd/worker
	@echo "Running Temporal worker..."
	@if [ -z "$$KUBECONFIG" ]; then \
		export KUBECONFIG=$$HOME/.kube/config; \
	fi; \
	./bin/$(WORKER_BINARY)

help:
	@echo "Available targets:"
	@echo "  all            - Generate proto and build"
	@echo "  proto          - Generate protobuf code"
	@echo "  build          - Build the binary"
	@echo "  run            - Build and run the service"
	@echo "  clean          - Remove build artifacts"
	@echo "  docker-build   - Build Docker image"
	@echo "  helm-install   - Install Helm chart"
	@echo "  helm-upgrade   - Upgrade Helm chart"
	@echo "  helm-uninstall - Uninstall Helm chart"
	@echo "  test           - Run tests"
	@echo "  deps           - Download and tidy dependencies"
	@echo "  install-tools  - Install protoc plugins"
	@echo "  temporal-up    - Start Temporal server with Docker Compose"
	@echo "  temporal-down  - Stop Temporal server"
	@echo "  worker         - Build and run Temporal worker"
