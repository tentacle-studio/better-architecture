package agent

// go:generate runs bpf2go to compile bpf/tcp_probe.c into Go-embedded objects.
// Run: go generate ./internal/agent/
//go:generate bpf2go -cc clang -target bpf TcpProbe ../../bpf/tcp_probe.c -- -I../../bpf -O2

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"net"

	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/ringbuf"
	"github.com/cilium/ebpf/rlimit"

	"github.com/better-architecture/ebpf-agent/internal/resolver"
)

// bpfEvent mirrors the C struct event layout in bpf/tcp_probe.c (32 bytes total).
// IP and port fields are byte arrays to avoid endian conversion — they're in
// network byte order (big-endian) and are fed directly to net.IP.
type bpfEvent struct {
	TsNs    uint64
	SrcIp   [4]byte
	DstIp   [4]byte
	DstPort [2]byte
	Pad0    [2]byte
	Bytes   uint32
	Proto   uint8
	Pad1    [7]byte
}

// Agent loads the BPF program, attaches the kprobe, and drains the ring buffer.
type Agent struct {
	resolver  *resolver.PodResolver
	publisher *Publisher
}

func New(res *resolver.PodResolver, pub *Publisher) *Agent {
	return &Agent{resolver: res, publisher: pub}
}

func (a *Agent) Run(ctx context.Context) error {
	if err := rlimit.RemoveMemlock(); err != nil {
		return fmt.Errorf("remove memlock rlimit: %w", err)
	}

	objs := tcpProbeObjects{}
	if err := loadTcpProbeObjects(&objs, nil); err != nil {
		return fmt.Errorf("load BPF objects: %w", err)
	}
	defer objs.Close()

	kp, err := link.Kprobe("tcp_sendmsg", objs.KprobeTcpSendmsg, nil)
	if err != nil {
		return fmt.Errorf("attach kprobe/tcp_sendmsg: %w", err)
	}
	defer kp.Close()

	rd, err := ringbuf.NewReader(objs.Events)
	if err != nil {
		return fmt.Errorf("ring buffer reader: %w", err)
	}
	defer rd.Close()

	// Unblock rd.Read() when the context is cancelled.
	go func() {
		<-ctx.Done()
		rd.Close()
	}()

	for {
		rec, err := rd.Read()
		if err != nil {
			if ctx.Err() != nil {
				return nil // clean shutdown
			}
			return fmt.Errorf("ring buffer read: %w", err)
		}

		var ev bpfEvent
		if err := binary.Read(bytes.NewReader(rec.RawSample), binary.LittleEndian, &ev); err != nil {
			continue
		}

		srcIPStr := net.IP(ev.SrcIp[:]).String()
		dstIPStr := net.IP(ev.DstIp[:]).String()
		dstPort := binary.BigEndian.Uint16(ev.DstPort[:])

		srcInfo, ok := a.resolver.LookupIPStr(srcIPStr)
		if !ok {
			continue // IP not a sandbox pod — skip
		}

		dstPodName := dstIPStr
		if dstInfo, ok := a.resolver.LookupIPStr(dstIPStr); ok {
			dstPodName = dstInfo.PodName
		}

		subject := fmt.Sprintf("traffic.user.%s.%s", srcInfo.UserID, srcInfo.SandboxID)
		a.publisher.Enqueue(subject, TrafficEvent{
			Ts:        ev.TsNs / 1_000_000, // ns → ms unix timestamp
			SrcPod:    srcInfo.PodName,
			DstPod:    dstPodName,
			SrcIP:     srcIPStr,
			DstIP:     dstIPStr,
			DstPort:   dstPort,
			Protocol:  protoName(ev.Proto),
			Bytes:     ev.Bytes,
			LatencyNs: 0, // filled in by application-layer tracing (OTel)
		})
	}
}

func protoName(proto uint8) string {
	switch proto {
	case 6:
		return "TCP"
	case 17:
		return "UDP"
	default:
		return "UNKNOWN"
	}
}
