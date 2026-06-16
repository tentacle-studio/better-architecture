.PHONY: all generate build vmlinux tidy image daemonset

CLANG       ?= clang
IMAGE_TAG   ?= ghcr.io/better-architecture/ebpf-agent:latest
BPF_SRC      = bpf/tcp_probe.c
VMLINUX_H    = bpf/vmlinux.h

all: generate build

# Generate vmlinux.h from the running kernel's BTF info.
# Requires: bpftool (apt-get install linux-tools-$(uname -r))
# Only needs re-running when the kernel changes.
vmlinux:
	bpftool btf dump file /sys/kernel/btf/vmlinux format c > $(VMLINUX_H)

# Compile BPF C into embedded Go objects.
# Requires: clang, llvm, linux-headers, bpf2go (installed by tidy/generate step below)
# Output: internal/agent/tcp_probe_bpfle.go  internal/agent/tcp_probe_bpfeb.go
generate: $(VMLINUX_H)
	go generate ./internal/agent/

# Install bpf2go tool (runs once, stored in module cache).
tools:
	go install github.com/cilium/ebpf/cmd/bpf2go@latest

# Fetch / verify module dependencies and update go.sum.
tidy:
	go mod tidy

# Build the agent binary (requires generate to have been run).
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/ebpf-agent ./cmd/agent/

# Build and push the container image (multi-stage; see Dockerfile).
image:
	docker buildx build --platform linux/amd64 -t $(IMAGE_TAG) --push .

# Apply the DaemonSet to the current kube context.
daemonset:
	kubectl apply -f k8s/daemonset.yaml
