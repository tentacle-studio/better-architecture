package grpc

import (
	"testing"

	"k8s.io/client-go/tools/remotecommand"
)

func TestTerminalSizeQueue_Next(t *testing.T) {
	queue := NewTerminalSizeQueue()
	defer queue.Close()

	if size := queue.Next(); size != nil {
		t.Errorf("Expected nil for empty queue, got %v", size)
	}

	queue.Resize(80, 24)
	size := queue.Next()
	if size == nil {
		t.Fatal("Expected size, got nil")
	}
	if size.Width != 80 || size.Height != 24 {
		t.Errorf("Expected 80x24, got %dx%d", size.Width, size.Height)
	}
}

func TestTerminalSizeQueue_Resize(t *testing.T) {
	queue := NewTerminalSizeQueue()
	defer queue.Close()

	tests := []struct {
		width  uint32
		height uint32
	}{
		{80, 24},
		{120, 40},
		{100, 30},
	}

	for _, tt := range tests {
		queue.Resize(tt.width, tt.height)
		size := queue.Next()
		if size == nil {
			t.Fatal("Expected size, got nil")
		}
		if size.Width != uint16(tt.width) || size.Height != uint16(tt.height) {
			t.Errorf("Expected %dx%d, got %dx%d", tt.width, tt.height, size.Width, size.Height)
		}
	}
}

func TestTerminalSizeQueue_Current(t *testing.T) {
	queue := NewTerminalSizeQueue()
	defer queue.Close()

	queue.Resize(80, 24)
	size1 := queue.Next()
	
	size2 := queue.Next()
	if size2 == nil {
		t.Fatal("Expected current size, got nil")
	}
	
	if size1.Width != size2.Width || size1.Height != size2.Height {
		t.Error("Current size should match last size")
	}
}

func TestTerminalSizeQueue_Interface(t *testing.T) {
	queue := NewTerminalSizeQueue()
	defer queue.Close()

	var _ remotecommand.TerminalSizeQueue = queue
}
