# 08 — Security & Isolation

Multi-layered sandbox isolation strategy using Kubernetes ResourceQuotas, NetworkPolicies, pod security standards, and gateway-level rate limiting to prevent tenant escape and resource abuse.

---

## 8.1 Namespace-level Isolation

Every sandbox namespace gets the following resources applied at creation time:

```yaml
# ResourceQuota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: sandbox-quota
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 512Mi
    limits.cpu: "2"
    limits.memory: 1Gi
    pods: "10"
    services: "5"
    persistentvolumeclaims: "2"

---
# LimitRange
apiVersion: v1
kind: LimitRange
metadata:
  name: sandbox-limits
spec:
  limits:
  - default:
      cpu: 200m
      memory: 256Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
```

---

## 8.2 NetworkPolicy — Default Deny + Allow DNS

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
  - to:
    - podSelector: {}  # allow intra-namespace
```

---

## 8.3 IMDS Protection

Blocks access to cloud provider metadata services to prevent credential theft.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-metadata
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # AWS IMDS
        - 100.100.100.200/32  # Alibaba
```

---

## 8.4 Pod Security

- Enforce `readOnlyRootFilesystem: true` via Pod Security Standards (Restricted)
- Only allow images from trusted registry prefix (enforced via OPA/Gatekeeper or Kyverno)
- Drop all capabilities, add only `NET_BIND_SERVICE` if needed
- Run as non-root (`runAsNonRoot: true, runAsUser: 1000`)

---

## 8.5 Gateway Security

- Rate limiting: 100 req/min per user, 10 sandbox creates/hour
- JWT expiry: 15min access, 7d refresh
- CORS: whitelist frontend origin only
- WebSocket origin validation
- Input validation on all endpoints (zod schemas)
