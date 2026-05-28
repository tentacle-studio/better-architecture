# syntax=docker/dockerfile:1

# Build the application from source
FROM golang:1.25-alpine AS build-stage

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/orchestrator ./cmd/orchestrator

# Download kubectl
RUN apk add --no-cache curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && mv kubectl /bin/kubectl

# Deploy the application binary into a lean image
FROM gcr.io/distroless/base-debian11 AS build-release-stage

WORKDIR /

COPY --from=build-stage /bin/orchestrator /bin/orchestrator
COPY --from=build-stage /bin/kubectl /bin/kubectl

ENTRYPOINT ["/bin/orchestrator"]