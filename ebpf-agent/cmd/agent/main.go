package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	natsgo "github.com/nats-io/nats.go"

	"github.com/better-architecture/ebpf-agent/internal/agent"
	"github.com/better-architecture/ebpf-agent/internal/config"
	"github.com/better-architecture/ebpf-agent/internal/resolver"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}

	nc, err := natsgo.Connect(cfg.NatsURL, natsgo.RetryOnFailedConnect(true), natsgo.MaxReconnects(-1))
	if err != nil {
		slog.Error("nats connect", "err", err)
		os.Exit(1)
	}
	defer nc.Drain()

	pub, err := agent.NewPublisher(nc, cfg.PublishInterval)
	if err != nil {
		slog.Error("publisher init", "err", err)
		os.Exit(1)
	}

	res, err := resolver.New(cfg.KubeConfigPath)
	if err != nil {
		slog.Error("resolver init", "err", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer cancel()

	if err := res.Watch(ctx); err != nil {
		slog.Error("resolver watch", "err", err)
		os.Exit(1)
	}

	go pub.Run(ctx)

	slog.Info("ebpf-agent started", "node", cfg.NodeName, "nats", cfg.NatsURL)

	ag := agent.New(res, pub)
	if err := ag.Run(ctx); err != nil {
		slog.Error("agent run", "err", err)
		os.Exit(1)
	}
}
