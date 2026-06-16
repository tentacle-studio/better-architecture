// SPDX-License-Identifier: GPL-2.0
// Kernel requirement: >= 5.8 (BPF_MAP_TYPE_RINGBUF), BTF enabled.
// vmlinux.h is generated via: bpftool btf dump file /sys/kernel/btf/vmlinux format c > bpf/vmlinux.h

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include <bpf/bpf_endian.h>

#define AF_INET 2

// Kernel event written to the ring buffer.
// Use fixed-size byte arrays for IP/port so the Go struct can read them without
// endian conversion — net.IP(bytes[:]) interprets them correctly as-is.
struct event {
    __u64 ts_ns;
    __u8  src_ip[4];   // network byte order (big-endian)
    __u8  dst_ip[4];   // network byte order
    __u8  dst_port[2]; // network byte order
    __u8  _pad[2];
    __u32 bytes;
    __u8  proto;       // 6=TCP, 17=UDP
    __u8  _pad2[7];    // align struct to 8 bytes (total: 32 bytes)
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 1 << 20); // 1 MiB
} events SEC(".maps");

SEC("kprobe/tcp_sendmsg")
int BPF_KPROBE(kprobe_tcp_sendmsg, struct sock *sk, struct msghdr *msg, size_t size) {
    __u16 family = BPF_CORE_READ(sk, __sk_common.skc_family);
    if (family != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e)
        return 0;

    e->ts_ns = bpf_ktime_get_ns();

    // IPs are stored as __be32 in the kernel (big-endian = network byte order).
    // Copy the raw 4 bytes directly so userspace can feed them to net.IP without
    // any further conversion.
    __u32 saddr = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    __u32 daddr = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    __builtin_memcpy(e->src_ip, &saddr, 4);
    __builtin_memcpy(e->dst_ip, &daddr, 4);

    // dst_port from kernel is in network byte order (__be16).
    __u16 dport = BPF_CORE_READ(sk, __sk_common.skc_dport);
    __builtin_memcpy(e->dst_port, &dport, 2);

    e->bytes = (__u32)size;
    e->proto = 6; // TCP

    bpf_ringbuf_submit(e, 0);
    return 0;
}

char __license[] SEC("license") = "GPL";
