package grpc

import (
	"sync"

	"k8s.io/client-go/tools/remotecommand"
)

type TerminalSizeQueue struct {
	mu      sync.Mutex
	sizes   chan *remotecommand.TerminalSize
	current *remotecommand.TerminalSize
}

func NewTerminalSizeQueue() *TerminalSizeQueue {
	return &TerminalSizeQueue{
		sizes: make(chan *remotecommand.TerminalSize, 10),
	}
}

func (t *TerminalSizeQueue) Next() *remotecommand.TerminalSize {
	select {
	case size := <-t.sizes:
		t.mu.Lock()
		t.current = size
		t.mu.Unlock()
		return size
	default:
		t.mu.Lock()
		defer t.mu.Unlock()
		return t.current
	}
}

func (t *TerminalSizeQueue) Resize(width, height uint32) {
	size := &remotecommand.TerminalSize{
		Width:  uint16(width),
		Height: uint16(height),
	}
	
	select {
	case t.sizes <- size:
	default:
	}
}

func (t *TerminalSizeQueue) Close() {
	close(t.sizes)
}
