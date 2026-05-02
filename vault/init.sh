#!/bin/sh
set -e

echo ">>> Seeding gateway secrets into Vault KV v2..."

vault kv put secret/gateway \
  DATABASE_URL="postgresql://gateway:gateway@localhost:5432/gateway" \
  REDIS_URL="redis://localhost:6379" \
  JWT_SECRET="dev-jwt-secret-change-in-production-min32chars"

echo ">>> Creating gateway policy..."

vault policy write gateway - <<'EOF'
path "secret/data/gateway" {
  capabilities = ["read"]
}
EOF

echo ""
echo ">>> Vault initialized successfully."
echo "    UI:          http://localhost:8200"
echo "    Token:       root"
echo "    Secret path: secret/data/gateway"
echo ""
echo "--- Production (k8s) setup ---"
echo "Run the following on your production Vault to enable Kubernetes auth:"
echo ""
echo "  vault auth enable kubernetes"
echo "  vault write auth/kubernetes/config \\"
echo "    kubernetes_host=https://\$KUBERNETES_SERVICE_HOST:\$KUBERNETES_SERVICE_PORT"
echo ""
echo "  vault write auth/kubernetes/role/gateway \\"
echo "    bound_service_account_names=gateway \\"
echo "    bound_service_account_namespaces=better-architecture \\"
echo "    policies=gateway \\"
echo "    ttl=1h"
echo ""
