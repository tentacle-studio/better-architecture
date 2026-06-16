#!/bin/bash
# Prepare kubeconfig variants for Docker containers
# - config-docker: for containers using bridge networking (host.docker.internal)
# - config-host: for containers using host networking (127.0.0.1, no TLS change needed)

KUBECONFIG_SOURCE="${HOME}/.kube/config"
KUBECONFIG_DOCKER="/tmp/kubeconfig-docker"
KUBECONFIG_HOST="/tmp/kubeconfig-host"

if [ ! -f "$KUBECONFIG_SOURCE" ]; then
  echo "Error: kubeconfig not found at $KUBECONFIG_SOURCE"
  exit 1
fi

# Docker bridge variant: replace server with host.docker.internal + skip TLS
sed -e 's|https://127.0.0.1:|https://host.docker.internal:|g' \
    -e 's|https://localhost:|https://host.docker.internal:|g' \
    -e '/certificate-authority-data:/d' \
    "$KUBECONFIG_SOURCE" | \
  awk '/server: https:/ {print; print "      insecure-skip-tls-verify: true"; next} 1' \
  > "$KUBECONFIG_DOCKER"

# Host network variant: keep 127.0.0.1 but skip TLS (cert valid for localhost)
sed -e '/certificate-authority-data:/d' \
    "$KUBECONFIG_SOURCE" | \
  awk '/server: https:/ {print; print "      insecure-skip-tls-verify: true"; next} 1' \
  > "$KUBECONFIG_HOST"

echo "✓ Created $KUBECONFIG_DOCKER (bridge networking, host.docker.internal)"
echo "✓ Created $KUBECONFIG_HOST (host networking, 127.0.0.1)"
