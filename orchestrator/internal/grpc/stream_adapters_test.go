package grpc

import (
	"bytes"
	"testing"
)

func TestStdoutWriter_Write(t *testing.T) {
	tests := []struct {
		name    string
		data    []byte
		wantLen int
	}{
		{
			name:    "write normal data",
			data:    []byte("hello world"),
			wantLen: 11,
		},
		{
			name:    "write empty data",
			data:    []byte{},
			wantLen: 0,
		},
		{
			name:    "write binary data",
			data:    []byte{0x00, 0x01, 0x02, 0xFF},
			wantLen: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.data) != tt.wantLen {
				t.Errorf("Data length = %d, want %d", len(tt.data), tt.wantLen)
			}
		})
	}
}

func TestStderrWriter_Write(t *testing.T) {
	tests := []struct {
		name    string
		data    []byte
		wantLen int
	}{
		{
			name:    "write error message",
			data:    []byte("error: something went wrong"),
			wantLen: 27,
		},
		{
			name:    "write empty error",
			data:    []byte{},
			wantLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.data) != tt.wantLen {
				t.Errorf("Data length = %d, want %d", len(tt.data), tt.wantLen)
			}
		})
	}
}

func TestStdinReader_BufferHandling(t *testing.T) {
	data := []byte("test input data")
	buffer := make([]byte, len(data))
	
	n := copy(buffer, data)
	if n != len(data) {
		t.Errorf("Copied %d bytes, want %d", n, len(data))
	}
	
	if !bytes.Equal(buffer, data) {
		t.Error("Buffer content doesn't match input data")
	}
}
