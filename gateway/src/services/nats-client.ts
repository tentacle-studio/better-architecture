import { connect, NatsConnection, JetStreamClient, DeliverPolicy, AckPolicy } from 'nats';
import type { Config } from '../config.js';
import type { RawTrafficEvent } from '../types/shared.js';

const TRAFFIC_STREAM = 'TRAFFIC';

export class NatsClient {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;

  constructor(private config: Config) {}

  async connect() {
    this.nc = await connect({ servers: this.config.natsUrl });
    this.js = this.nc.jetstream();
  }

  async subscribeTraffic(
    userId: string,
    sandboxId: string,
    callback: (msg: RawTrafficEvent) => void
  ): Promise<() => void> {
    if (!this.js || !this.nc) throw new Error('NATS not connected');

    const durableName = `traffic-${userId}-${sandboxId}`;
    const subject = `traffic.user.${userId}.${sandboxId}`;

    const jsm = await this.nc.jetstreamManager();
    try {
      await jsm.consumers.add(TRAFFIC_STREAM, {
        durable_name: durableName,
        deliver_policy: DeliverPolicy.New,
        ack_policy: AckPolicy.Explicit,
        filter_subject: subject,
        max_ack_pending: 1000,
      });
    } catch {
      // consumer already exists on reconnect — proceed
    }

    const consumer = await this.js.consumers.get(TRAFFIC_STREAM, durableName);
    const messages = await consumer.consume();

    (async () => {
      for await (const msg of messages) {
        try {
          const data = JSON.parse(msg.data.toString()) as RawTrafficEvent;
          callback(data);
          msg.ack();
        } catch {
          msg.nak();
        }
      }
    })();

    return () => messages.close();
  }

  async publish(subject: string, data: unknown) {
    if (!this.js) throw new Error('NATS not connected');
    await this.js.publish(subject, JSON.stringify(data));
  }

  async close() {
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
    }
  }
}
