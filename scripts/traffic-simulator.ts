/**
 * Traffic Simulator
 *
 * Publishes fake eBPF traffic events to NATS JetStream so the gateway and
 * frontend Canvas2D can be developed without a real eBPF DaemonSet.
 *
 * Usage (run from the scripts/ directory after `npm install`):
 *   cd scripts && npm install
 *   npx tsx ./traffic-simulator.ts
 *   NATS_URL=nats://localhost:4222 npx tsx ./traffic-simulator.ts --user u1 --sandbox s1
 *
 * Prerequisites:
 *   docker-compose up nats
 *   The TRAFFIC stream must exist (created automatically by the script if missing).
 */

import { connect, RetentionPolicy, StorageType, AckPolicy, DeliverPolicy } from "nats"

const NATS_URL   = process.env.NATS_URL   ?? "nats://localhost:4222"
const USER_ID    = process.argv.includes("--user")    ? process.argv[process.argv.indexOf("--user") + 1]    : "dev-user"
const SANDBOX_ID = process.argv.includes("--sandbox") ? process.argv[process.argv.indexOf("--sandbox") + 1] : "test-sandbox-01"
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 200)

const PODS = [
  { name: "nginx-pod",      ip: "10.0.1.5"  },
  { name: "redis-svc",      ip: "10.0.1.6"  },
  { name: "postgres-svc",   ip: "10.0.1.7"  },
  { name: "api-server",     ip: "10.0.1.8"  },
  { name: "worker-pod",     ip: "10.0.1.9"  },
]

const PROTOCOLS = ["TCP", "HTTP", "TCP"] as const

function randomPair() {
  const src = PODS[Math.floor(Math.random() * PODS.length)]
  const rest = PODS.filter(p => p.name !== src.name)
  const dst = rest[Math.floor(Math.random() * rest.length)]
  return { src, dst }
}

async function main() {
  const nc = await connect({ servers: NATS_URL })
  const jsm = await nc.jetstreamManager()
  const js  = nc.jetstream()

  const subject = `traffic.user.${USER_ID}.${SANDBOX_ID}`

  try {
    await jsm.streams.add({
      name: "TRAFFIC",
      subjects: ["traffic.user.>"],
      retention: RetentionPolicy.Workqueue,
      storage: StorageType.Memory,
      max_age: 5 * 60 * 1_000_000_000, // 5 min in nanoseconds
      max_bytes: 1_073_741_824,         // 1 GB
      num_replicas: 1,
    })
    console.log("Created TRAFFIC stream")
  } catch {
    console.log("TRAFFIC stream already exists — reusing")
  }

  console.log(`Simulating traffic on ${subject} every ${INTERVAL_MS}ms`)
  console.log("Pods:", PODS.map(p => p.name).join(", "))
  console.log("Press Ctrl-C to stop\n")

  let seq = 0
  const timer = setInterval(async () => {
    const { src, dst } = randomPair()
    const protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)]
    const payload = JSON.stringify({
      ts:         Date.now(),
      src_pod:    src.name,
      dst_pod:    dst.name,
      src_ip:     src.ip,
      dst_ip:     dst.ip,
      dst_port:   protocol === "HTTP" ? 80 : 6379,
      protocol,
      bytes:      Math.floor(Math.random() * 4096) + 64,
      latency_ns: Math.floor(Math.random() * 5_000_000) + 100_000,
    })

    try {
      await js.publish(subject, payload)
      if (++seq % 20 === 0) process.stdout.write(".")
    } catch (err) {
      console.error("publish error:", err)
    }
  }, INTERVAL_MS)

  process.on("SIGINT", async () => {
    clearInterval(timer)
    console.log("\nDraining…")
    await nc.drain()
    process.exit(0)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
