# ── Stage 1: Go build ────────────────────────────────────────────────────────
# BPF objects are pre-compiled via `make generate` and checked in as
# tcp_probe_bpfle.go / tcp_probe_bpfeb.go — no clang needed in this stage.
FROM golang:1.22-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /bin/ebpf-agent ./cmd/agent/

# ── Stage 2: Minimal runtime ─────────────────────────────────────────────────
# The agent runs as root (required for BPF capabilities) inside a minimal image.
# Capabilities are granted via the DaemonSet securityContext, not the image.
FROM gcr.io/distroless/static:nonroot AS final

COPY --from=builder /bin/ebpf-agent /ebpf-agent

USER root
ENTRYPOINT ["/ebpf-agent"]
