package grpc

import (
	"io"
	"sync"

	pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
)

type StdinReader struct {
	stream pb.Orchestrator_ExecStreamServer
	buffer []byte
	mu     sync.Mutex
	closed bool
}

func NewStdinReader(stream pb.Orchestrator_ExecStreamServer) *StdinReader {
	return &StdinReader{
		stream: stream,
		buffer: make([]byte, 0),
	}
}

func (r *StdinReader) Read(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return 0, io.EOF
	}

	if len(r.buffer) == 0 {
		r.mu.Unlock()
		in, err := r.stream.Recv()
		r.mu.Lock()

		if err != nil {
			r.closed = true
			if err == io.EOF {
				return 0, io.EOF
			}
			return 0, err
		}

		if len(in.Stdin) > 0 {
			r.buffer = append(r.buffer, in.Stdin...)
		}
	}

	if len(r.buffer) == 0 {
		return 0, nil
	}

	n := copy(p, r.buffer)
	r.buffer = r.buffer[n:]
	return n, nil
}

func (r *StdinReader) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.closed = true
	return nil
}

type StdoutWriter struct {
	stream pb.Orchestrator_ExecStreamServer
	mu     sync.Mutex
}

func NewStdoutWriter(stream pb.Orchestrator_ExecStreamServer) *StdoutWriter {
	return &StdoutWriter{
		stream: stream,
	}
}

func (w *StdoutWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if len(p) == 0 {
		return 0, nil
	}

	data := make([]byte, len(p))
	copy(data, p)

	err := w.stream.Send(&pb.ExecOutput{
		Stdout: data,
	})
	if err != nil {
		return 0, err
	}

	return len(p), nil
}

type StderrWriter struct {
	stream pb.Orchestrator_ExecStreamServer
	mu     sync.Mutex
}

func NewStderrWriter(stream pb.Orchestrator_ExecStreamServer) *StderrWriter {
	return &StderrWriter{
		stream: stream,
	}
}

func (w *StderrWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if len(p) == 0 {
		return 0, nil
	}

	data := make([]byte, len(p))
	copy(data, p)

	err := w.stream.Send(&pb.ExecOutput{
		Stderr: data,
	})
	if err != nil {
		return 0, err
	}

	return len(p), nil
}
