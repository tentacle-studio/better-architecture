# Makefile
# Root build orchestrator for better-architecture
# Delegates to: orchestrator/ (Go), gateway/ (Node/Fastify), frontend/ (React/Vite)

.PHONY: all build clean install dev dev-full dev-full-down \
        orchestrator-build orchestrator-run orchestrator-test orchestrator-clean \
        orchestrator-proto orchestrator-worker \
        orchestrator-temporal-up orchestrator-temporal-down \
        orchestrator-helm-install orchestrator-helm-upgrade orchestrator-helm-uninstall \
        gateway-install gateway-dev gateway-build gateway-db-migrate gateway-db-studio \
        gateway-docker-build gateway-helm-install gateway-helm-upgrade gateway-helm-uninstall \
        frontend-install frontend-dev frontend-build \
        frontend-docker-build frontend-helm-install frontend-helm-upgrade frontend-helm-uninstall \
        docker-build \
        vault-up vault-down vault-status vault-init \
        help

# Default: build all services
all: build

# ─── Install dependencies ────────────────────────────────────────────────────

install: gateway-install frontend-install
	@echo "All Node dependencies installed."

gateway-install:
	@echo "Installing gateway dependencies..."
	cd gateway && pnpm install

frontend-install:
	@echo "Installing frontend dependencies..."
	cd frontend && pnpm install

# ─── Build ───────────────────────────────────────────────────────────────────

build: orchestrator-build gateway-build frontend-build

orchestrator-build:
	$(MAKE) -C orchestrator build

gateway-build:
	@echo "Building gateway..."
	cd gateway && pnpm run build

frontend-build:
	@echo "Building frontend..."
	cd frontend && pnpm run build

# ─── Dev servers ─────────────────────────────────────────────────────────────

dev: vault-init
	@echo "Preparing kubeconfig for Docker..."
	@./scripts/prepare-kubeconfig.sh
	@if [ -z "$$KUBECONFIG" ]; then \
		export KUBECONFIG=$$HOME/.kube/config; \
	fi; \
	docker compose up --build -d

dev-down:
	@echo "Stopping gateway and frontend containers..."
	docker compose down

gateway-dev:
	@echo "Starting gateway dev server..."
	cd gateway && pnpm run dev

frontend-dev:
	@echo "Starting frontend dev server..."
	cd frontend && pnpm run dev

# ─── Orchestrator ────────────────────────────────────────────────────────────

orchestrator-run:
	$(MAKE) -C orchestrator run

orchestrator-test:
	$(MAKE) -C orchestrator test

orchestrator-proto:
	$(MAKE) -C orchestrator proto

orchestrator-worker:
	$(MAKE) -C orchestrator worker

orchestrator-clean:
	$(MAKE) -C orchestrator clean

orchestrator-temporal-up:
	$(MAKE) -C orchestrator temporal-up

orchestrator-temporal-down:
	$(MAKE) -C orchestrator temporal-down

# ─── Gateway database ────────────────────────────────────────────────────────

gateway-db-migrate:
	@echo "Running gateway DB migrations..."
	cd gateway && pnpm run db:migrate

gateway-db-studio:
	@echo "Opening Drizzle Studio..."
	cd gateway && pnpm run db:studio

# ─── Docker ──────────────────────────────────────────────────────────────────

docker-build: orchestrator-docker-build gateway-docker-build frontend-docker-build

orchestrator-docker-build:
	$(MAKE) -C orchestrator docker-build

gateway-docker-build:
	@echo "Building gateway Docker image..."
	docker build -t gateway:latest gateway/

frontend-docker-build:
	@echo "Building frontend Docker image..."
	docker build -t frontend:latest frontend/

# ─── Helm ────────────────────────────────────────────────────────────────────

HELM_NS ?= better-architecture

orchestrator-helm-install:
	$(MAKE) -C orchestrator helm-install

orchestrator-helm-upgrade:
	$(MAKE) -C orchestrator helm-upgrade

orchestrator-helm-uninstall:
	$(MAKE) -C orchestrator helm-uninstall

gateway-helm-install:
	@echo "Installing gateway Helm chart..."
	helm install gateway gateway/deploy/helm/gateway \
		--namespace $(HELM_NS) \
		--create-namespace

gateway-helm-upgrade:
	@echo "Upgrading gateway Helm chart..."
	helm upgrade gateway gateway/deploy/helm/gateway \
		--namespace $(HELM_NS)

gateway-helm-uninstall:
	@echo "Uninstalling gateway Helm chart..."
	helm uninstall gateway --namespace $(HELM_NS)

frontend-helm-install:
	@echo "Installing frontend Helm chart..."
	helm install frontend frontend/deploy/helm/frontend \
		--namespace $(HELM_NS) \
		--create-namespace

frontend-helm-upgrade:
	@echo "Upgrading frontend Helm chart..."
	helm upgrade frontend frontend/deploy/helm/frontend \
		--namespace $(HELM_NS)

frontend-helm-uninstall:
	@echo "Uninstalling frontend Helm chart..."
	helm uninstall frontend --namespace $(HELM_NS)

# ─── Vault (local dev) ───────────────────────────────────────────────────────

vault-up:
	@echo "Starting local dev stack (Vault + Postgres + Redis + NATS)..."
	docker compose up -d vault temporal-postgresql redis nats

vault-init: vault-up
	@echo "Waiting for Vault to be healthy then seeding secrets..."
	docker compose up --wait vault
	docker compose --profile init run --rm vault-init

vault-down:
	@echo "Stopping local dev stack..."
	docker compose down

vault-status:
	@echo "Vault status:"
	@VAULT_ADDR=http://localhost:8200 VAULT_TOKEN=root vault status 2>/dev/null || \
		docker compose exec vault vault status

# ─── Clean ───────────────────────────────────────────────────────────────────

clean: orchestrator-clean
	@echo "Clean complete."

# ─── Help ────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Top-level targets:"
	@echo "  all                          - Build all services (default)"
	@echo "  install                      - Install Node deps for gateway + frontend"
	@echo "  build                        - Build orchestrator, gateway, and frontend"
	@echo "  dev                          - Start gateway + frontend (requires vault-init)"
	@echo "  dev-full                     - Start orchestrator + gateway container + frontend container"
	@echo "  dev-full-down                - Stop gateway and frontend containers"
	@echo "  clean                        - Clean all build artifacts"
	@echo "  docker-build                 - Build Docker images for all services"
	@echo ""
	@echo "Vault (local dev):"
	@echo "  vault-up                     - Start Vault + Postgres + Redis + NATS"
	@echo "  vault-init                   - Seed gateway secrets into local Vault"
	@echo "  vault-down                   - Stop local dev stack"
	@echo "  vault-status                 - Show Vault seal/init status"
	@echo ""
	@echo "Orchestrator (Go):"
	@echo "  orchestrator-build           - Build the orchestrator binary"
	@echo "  orchestrator-run             - Build and run the orchestrator"
	@echo "  orchestrator-test            - Run Go tests"
	@echo "  orchestrator-proto           - Generate protobuf code"
	@echo "  orchestrator-worker          - Build and run the Temporal worker"
	@echo "  orchestrator-clean           - Remove orchestrator build artifacts"
	@echo "  orchestrator-temporal-up     - Start Temporal server via Docker Compose"
	@echo "  orchestrator-temporal-down   - Stop Temporal server"
	@echo "  orchestrator-docker-build    - Build orchestrator Docker image"
	@echo "  orchestrator-helm-install    - Install orchestrator Helm chart"
	@echo "  orchestrator-helm-upgrade    - Upgrade orchestrator Helm chart"
	@echo "  orchestrator-helm-uninstall  - Uninstall orchestrator Helm chart"
	@echo ""
	@echo "Gateway (Fastify/TypeScript):"
	@echo "  gateway-install              - Install pnpm dependencies"
	@echo "  gateway-dev                  - Start dev server (tsx watch)"
	@echo "  gateway-build                - Compile TypeScript"
	@echo "  gateway-db-migrate           - Run database migrations"
	@echo "  gateway-db-studio            - Open Drizzle Studio"
	@echo "  gateway-docker-build         - Build gateway Docker image"
	@echo "  gateway-helm-install         - Install gateway Helm chart"
	@echo "  gateway-helm-upgrade         - Upgrade gateway Helm chart"
	@echo "  gateway-helm-uninstall       - Uninstall gateway Helm chart"
	@echo ""
	@echo "Frontend (React/Vite):"
	@echo "  frontend-install             - Install pnpm dependencies"
	@echo "  frontend-dev                 - Start Vite dev server"
	@echo "  frontend-build               - Production build"
	@echo "  frontend-docker-build        - Build frontend Docker image"
	@echo "  frontend-helm-install        - Install frontend Helm chart"
	@echo "  frontend-helm-upgrade        - Upgrade frontend Helm chart"
	@echo "  frontend-helm-uninstall      - Uninstall frontend Helm chart"
	@echo ""
	@echo "Variables:"
	@echo "  HELM_NS  - Kubernetes namespace for helm installs (default: better-architecture)"
	@echo ""