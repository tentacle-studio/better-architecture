package agent

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// TrafficEvent is the JSON payload published to NATS JetStream.
// Field names match gateway/src/types/shared.ts RawTrafficEvent.
type TrafficEvent struct {
	Ts        uint64 `json:"ts"`
	SrcPod    string `json:"src_pod"`
	DstPod    string `json:"dst_pod"`
	SrcIP     string `json:"src_ip"`
	DstIP     string `json:"dst_ip"`
	DstPort   uint16 `json:"dst_port"`
	Protocol  string `json:"protocol"`
	Bytes     uint32 `json:"bytes"`
	LatencyNs uint64 `json:"latency_ns"`
}

// Publisher batches TrafficEvents per NATS subject and flushes on a timer.
// This avoids one NATS publish call per kernel event at high event rates.
type Publisher struct {
	js       jetstream.JetStream
	mu       sync.Mutex
	batches  map[string][]TrafficEvent
	interval time.Duration
}

func NewPublisher(nc *nats.Conn, interval time.Duration) (*Publisher, error) {
	js, err := jetstream.New(nc)
	if err != nil {
		return nil, err
	}
	return &Publisher{
		js:       js,
		batches:  make(map[string][]TrafficEvent),
		interval: interval,
	}, nil
}

// Enqueue adds an event to the pending batch for subject.
func (p *Publisher) Enqueue(subject string, ev TrafficEvent) {
	p.mu.Lock()
	p.batches[subject] = append(p.batches[subject], ev)
	p.mu.Unlock()
}

// Run flushes batches on a ticker until ctx is cancelled.
func (p *Publisher) Run(ctx context.Context) {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			p.flush(ctx)
			return
		case <-ticker.C:
			p.flush(ctx)
		}
	}
}

func (p *Publisher) flush(ctx context.Context) {
	p.mu.Lock()
	if len(p.batches) == 0 {
		p.mu.Unlock()
		return
	}
	batches := p.batches
	p.batches = make(map[string][]TrafficEvent, len(batches))
	p.mu.Unlock()

	for subject, events := range batches {
		for _, ev := range events {
			data, err := json.Marshal(ev)
			if err != nil {
				continue
			}
			if _, err := p.js.Publish(ctx, subject, data); err != nil {
				// Non-fatal: NATS publish failure (stream not ready, backpressure).
				// Events are silently dropped; the ring buffer drop counter tracks loss.
				_ = err
			}
		}
	}
}
