package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

type Publisher struct {
	nc *nats.Conn
}

type SandboxEvent struct {
	SandboxID string                 `json:"sandbox_id"`
	EventType string                 `json:"event_type"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

const (
	EventSandboxCreating  = "creating"
	EventSandboxReady     = "ready"
	EventSandboxFailed    = "failed"
	EventSandboxDestroying = "destroying"
	EventSandboxDestroyed = "destroyed"
)

func NewPublisher(natsURL string) (*Publisher, error) {
	nc, err := nats.Connect(natsURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	return &Publisher{nc: nc}, nil
}

func (p *Publisher) PublishSandboxEvent(sandboxID, eventType string, data map[string]interface{}) error {
	event := SandboxEvent{
		SandboxID: sandboxID,
		EventType: eventType,
		Timestamp: time.Now(),
		Data:      data,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	subject := fmt.Sprintf("sandbox.%s.%s", sandboxID, eventType)
	if err := p.nc.Publish(subject, eventJSON); err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	return nil
}

func (p *Publisher) Close() {
	if p.nc != nil {
		p.nc.Close()
	}
}
