# System Architecture

This document provides comprehensive architecture diagrams for the Better-Architecture educational platform.

## 1. System Context Diagram

```mermaid
graph TB
    subgraph Platform ["Better-Architecture Platform"]
        direction TB
        FE[("Frontend Web App<br/>React 19 + Vite + Tailwind")]
        GW[("API Gateway<br/>Node.js + Fastify")]
        ORC[("Orchestrator<br/>Go + gRPC + Kubernetes")]
    end

    ST[(Student/Developer)] -->|HTTPS / WS| FE
    ED[(Educator/Admin)] -->|Manages via| FE

    FE -->|HTTP/REST, WebSocket| GW
    GW -->|gRPC| ORC

    subgraph Data [External Systems]
        direction TB
        PG[(PostgreSQL<br/>User Data, Labs)]
        RS[(Redis<br/>Sessions)]
        NS[(NATS JetStream<br/>Events)]
        TM[(Temporal<br/>Workflows)]
        VL[(Vault<br/>Secrets)]
        K8[(Kubernetes<br/>Sandboxes)]
    end

    GW --> PG
    GW --> RS
    GW --> NS
    GW --> VL
    ORC --> TM
    ORC --> K8

    classDef platform fill:#e3f2fd,stroke:#1976d2
    classDef data fill:#f5f5f5,stroke:#666
    class FE,GW,ORC platform
    class PG,RS,NS,TM,VL,K8 data
```

## 2. Container/Component Diagram

```mermaid
graph TB
    subgraph Frontend ["Frontend Application"]
        SPA[("SPA<br/>React + Router")]
        OTEL[("OpenTelemetry<br/>Web Vitals")]
    end

    subgraph Gateway ["API Gateway"]
        FAST[("Fastify Server<br/>HTTP + WS")]
        AUTH[("Auth Service<br/>JWT, OIDC")]
        DB[("Database Client<br/>Drizzle ORM")]
        NATSC[("NATS Client")]
        ORCG[("Orchestrator Client<br/>gRPC")]
    end

    subgraph Orchestrator ["Orchestrator Service"]
        GRPC[("gRPC Server")]
        K8SC[("K8s Client<br/>client-go, Helm")]
        JUDGE[("Judge Engine<br/>Validation")]
        TEMP[("Temporal Worker")]
    end

    USR((User)) -->|HTTPS| SPA
    USR -->|WS| SPA

    SPA -->|REST| FAST
    SPA -->|WS| FAST

    FAST --> AUTH
    FAST --> DB
    FAST --> NATSC
    FAST --> ORCG

    ORCG --> GRPC
    GRPC --> K8SC
    GRPC --> JUDGE
    GRPC --> TEMP

    subgraph Data ["Data Layer"]
        PG[(PostgreSQL)]
        RS[Redis]
        NS[NATS JetStream]
        TM[Temporal]
        VL[Vault]
        K8S[Kubernetes]
    end

    AUTH --> VL
    DB --> PG
    FAST --> RS
    NATSC --> NS
    TEMP --> TM
    K8SC --> K8S

    classDef frontend fill:#e3f2fd,stroke:#1976d2
    classDef gateway fill:#fff3e0,stroke:#f57c00
    classDef orchestrator fill:#f3e5f5,stroke:#7b1fa2
    classDef data fill:#f5f5f5,stroke:#666
    class SPA,OTEL frontend
    class FAST,AUTH,DB,NATSC,ORCG gateway
    class GRPC,K8SC,JUDGE,TEMP orchestrator
    class PG,RS,NS,TM,VL,K8S data
```

## 3. Sequence Diagrams

### 3.1 Lab Session Creation Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as Student
    participant FE as Frontend
    participant GW as Gateway
    participant Auth as Auth Service
    participant DB as PostgreSQL
    participant Orch as Orchestrator
    participant Temp as Temporal
    participant K8s as Kubernetes

    User->>FE: Click "Start Lab"
    FE->>GW: POST /labs/{id}/start (JWT)
    GW->>Auth: Verify JWT
    Auth-->>GW: Valid + claims
    GW->>DB: Fetch lab by ID
    DB-->>GW: Lab + seed manifest
    GW->>Orch: gRPC CreateSandbox
    Orch->>Temp: Start SetupLabEnvironment
    Temp-->>Orch: workflowId
    Orch->>K8s: Create namespace + vCluster
    K8s-->>Orch: Namespace ready
    Orch->>K8s: Apply seed manifest
    K8s-->>Orch: Workloads deployed
    Orch-->>GW: sandboxId + status
    GW->>DB: Create sandbox_session
    GW-->>FE: {sandboxId, wsUrls}
    FE->>GW: WS /ws/terminal/{sandboxId}
    GW->>Orch: gRPC ExecStream
    Orch-->>GW: Stream established
    FE->>User: Terminal ready
```

### 3.2 Terminal WebSocket Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Xterm as Xterm.js
    participant FE as FE WS Client
    participant GW as Gateway
    participant Orch as Orchestrator
    participant Pod as Shell Pod

    User->>Xterm: Type command
    Xterm->>FE: Encode stdin → binary
    FE->>GW: WebSocket binary frame
    GW->>Orch: gRPC ExecInput(binary)
    Orch->>Pod: RemoteCommand.Exec()
    Pod->>Orch: stdout+stderr bytes
    Orch-->>GW: gRPC ExecOutput
    GW-->>FE: WebSocket binary frame
    FE->>Xterm: Render output
    Xterm->>User: Display

    Note over User,Pod: Bidirectional streaming
    Note over FE,GW: 30s heartbeat ping/pong
```

### 3.3 Lab Validation Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant FE as Frontend
    participant GW as Gateway
    participant Orch as Orchestrator
    participant Judge as Judge Engine
    participant K8s as vCluster

    User->>FE: Click "Submit"
    FE->>GW: POST /labs/{id}/submit
    GW->>Orch: gRPC ValidateQuiz
    Orch->>Judge: Run validation pipeline
    Judge->>K8s: StateCheck (kubectl get all)
    Judge->>K8s: LivenessCheck (HTTP probe)
    Judge->K8s: SLACheck (metrics query)
    K8s-->>Judge: Resource state
    Judge-->>Orch: ValidationResult
    alt Passed
        Orch-->>GW: {passed: true, score}
        GW->>DB: Award XP + completion
        GW-->>FE: Success
    else Failed
        Orch-->>GW: {passed: false, checks}
        GW-->>FE: Failed with feedback
    end
```

## 4. Deployment Diagram

```mermaid
flowchart TB
    subgraph "Cloud Region: us-east-1"
        LB[("Load Balancer<br/>TLS Termination<br/>SSL Passthrough for WS")]

        subgraph "Public Subnet A"
            FE1["Frontend 1<br/>Nginx:80"]
            GW1["Gateway 1<br/>Node:3000"]
        end

        subgraph "Public Subnet B"
            FE2["Frontend 2<br/>Nginx:80"]
            GW2["Gateway 2<br/>Node:3000"]
        end

        subgraph "Private Subnet A"
            ORC1["Orchestrator 1<br/>Go:50051"]
        end

        subgraph "Private Subnet B"
            ORC2["Orchestrator 2<br/>Go:50051"]
        end

        subgraph "Data Layer"
            PG[(PostgreSQL<br/>Primary)]
            RG1[(Replica A)]
            RG2[(Replica B)]
            REDIS[(Redis Cluster<br/>3 nodes)]
            NATS[(NATS JetStream<br/>3 nodes)]
            TEMP[(Temporal<br/>3 nodes)]
            VAULT[(Vault HA<br/>3 nodes)]
        end

        subgraph "Kubernetes Worker Nodes"
            WN1["Worker Node 1"]
            WN2["Worker Node 2"]
        end
    end

    User((Users)) --> LB
    LB -->|HTTPS| FE1 & FE2
    LB -->|WS| GW1 & GW2

    GW1 -->|Read| RG1
    GW2 -->|Read| RG2
    GW1 & GW2 -->|Write| PG
    GW1 & GW2 -->|Cache| REDIS
    GW1 & GW2 -->|Pub/Sub| NATS
    GW1 & GW2 -->|Secrets| VAULT
    GW1 & GW2 -->|gRPC| ORC1 & ORC2

    ORC1 & ORC2 -->|Workflows| TEMP
    ORC1 & ORC2 -->|K8s API| WN1 & WN2

    PG -->|Async| RG1
    PG -->|Async| RG2
```

## 5. Data Flow Diagrams

### 5.1 User Request Flow

```mermaid
graph LR
    A[User Browser] -->|HTTPS| B[Load Balancer]
    B -->|Route| C[(Gateway Inst 1)]
    B -->|Route| D[(Gateway Inst 2)]

    C --> E{Auth Check}
    E -->|Valid| F[Route Handler]
    E -->|Invalid| G[401 Error]

    F --> H[DB Read]
    F --> I[Cache Check]
    F -->|Sandbox Op| J[gRPC to Orch]

    H --> K[(PostgreSQL)]
    I --> L[(Redis)]
    J --> M[(Orchestrator)]

    M --> N[(Temporal)]
    M --> O[(Kubernetes)]
```

### 5.2 Real-time Traffic Visualization Flow

```mermaid
graph LR
    A[vCluster Workloads] --> B[eBPF Ingress]
    B -->|Publish| C[NATS JetStream]
    C -->|Subscribe| D[Gateway WS Handler]
    D -->|Broadcast| E[Frontend WS Client]
    E --> F[Canvas Component]
```

---

## Appendix: Technology Stack Reference

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, Vite, Tailwind | UI rendering, routing |
| **Gateway** | Fastify, TypeScript | REST API, WebSocket |
| **Orchestrator** | Go, gRPC, client-go | Sandbox provisioning |
| **Database** | PostgreSQL 16 | Persistent data |
| **Cache** | Redis 7 | Sessions, rate limiting |
| **Messaging** | NATS JetStream | Event streaming |
| **Workflows** | Temporal | Async orchestration |
| **Secrets** | Vault | Key management |
| **Orchestration** | Kubernetes, vCluster | Container runtime |