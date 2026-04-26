#!/bin/bash
set -e

echo "🚀 Setting up Go Orchestrator..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.22 or higher."
    exit 1
fi

echo "✅ Go version: $(go version)"

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo "❌ protoc is not installed. Please install Protocol Buffers compiler."
    echo "   macOS: brew install protobuf"
    echo "   Ubuntu: sudo apt install protobuf-compiler"
    exit 1
fi

echo "✅ protoc version: $(protoc --version)"

# Install protoc plugins
echo "📦 Installing protoc plugins..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Download dependencies
echo "📦 Downloading Go dependencies..."
go mod download
go mod tidy

# Generate protobuf code
echo "🔨 Generating protobuf code..."
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    internal/grpc/proto/orchestrator.proto

# Build the binary
echo "🔨 Building orchestrator..."
go build -o bin/orchestrator ./cmd/orchestrator

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Configure environment variables (see .env.example)"
echo "  2. Run: ./bin/orchestrator"
echo "  or"
echo "  3. Run: make run"
