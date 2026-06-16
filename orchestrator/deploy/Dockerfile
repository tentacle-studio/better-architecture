FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git protobuf-dev protoc

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    internal/grpc/proto/orchestrator.proto

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o orchestrator ./cmd/orchestrator

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/orchestrator .

EXPOSE 50051

CMD ["./orchestrator"]
