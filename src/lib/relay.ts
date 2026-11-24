import mqtt, { MqttClient } from "mqtt";
import { BROKERS, TRANSPORT } from "@/config/transport";
import { deriveRoom, decryptJson, encryptJson, RoomKeys } from "@/lib/roomCrypto";

/**
 * Room transport: a host-authoritative message bus over public MQTT brokers.
 *
 * Two topics per room so nobody hears their own echo:
 *   <prefix>/<topicId>/h   host  -> everyone
 *   <prefix>/<topicId>/c   peers -> host
 *
 * We hold a connection to every broker and publish to all of them. Players
 * need just one broker in common, so one broker being down, blocked or rate
 * limited is survivable. Inbound duplicates are dropped by message id.
 */

export type RelayRole = "host" | "client";

export type RelayStatus = "connecting" | "connected" | "reconnecting" | "failed";

export type RelayInbound = {
  type: string;
  from: string;
  role: RelayRole;
  data: unknown;
};

type Envelope = {
  id: string;
  from: string;
  role: RelayRole;
  type: string;
  data: unknown;
  ts: number;
};

export const HOST_PEER = "__host__";

export type RelayOptions = {
  code: string;
  role: RelayRole;
  selfId: string;
  onMessage: (msg: RelayInbound) => void;
  onStatusChange?: (status: RelayStatus, connectedBrokers: string[]) => void;
  /** A host client went quiet, or (on a client) the host went quiet. */
  onPeerTimeout?: (peerId: string) => void;
  /** Extra fields to piggyback on every heartbeat. */
  heartbeatData?: () => Record<string, unknown>;
};

export class RelayClient {
  private readonly opts: RelayOptions;
  private room: RoomKeys | null = null;
  private clients = new Map<string, MqttClient>();
  private connected = new Set<string>();
  private seen = new Set<string>();
  private seenOrder: string[] = [];
  private lastSeen = new Map<string, number>();
  private seq = 0;
  /**
   * Message ids must be unique per connection, not per player: a player who
   * reloads keeps their identity but restarts their counter, and the host's
   * duplicate filter would otherwise swallow everything they send next.
   */
  private readonly nonce = Math.random().toString(36).slice(2, 8);
  private sendChain: Promise<unknown> = Promise.resolve();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reaperTimer: ReturnType<typeof setInterval> | null = null;
  private status: RelayStatus = "connecting";
  private stopped = false;
  private sawHost = false;
  private onVisibility: (() => void) | null = null;

  constructor(opts: RelayOptions) {
    this.opts = opts;
  }

  get inTopic(): string {
    const base = `${TRANSPORT.topicPrefix}/${this.room!.topicId}`;
    return this.opts.role === "host" ? `${base}/c` : `${base}/h`;
  }

  get outTopic(): string {
    const base = `${TRANSPORT.topicPrefix}/${this.room!.topicId}`;
    return this.opts.role === "host" ? `${base}/h` : `${base}/c`;
  }

  get connectedBrokers(): string[] {
    return [...this.connected];
  }

  /** Resolves as soon as one broker is live; rejects if none answers. */
  async start(): Promise<void> {
    this.room = await deriveRoom(this.opts.code);

    // Last will: if the browser dies, the broker announces our exit for us.
    const willPayload = await encryptJson(this.room, this.envelope("LEAVE", {}));

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const failures: string[] = [];

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.setStatus("failed");
        reject(new Error(`No broker reachable (tried ${BROKERS.length})`));
      }, TRANSPORT.connectTimeoutMs);

      for (const broker of BROKERS) {
        const client = mqtt.connect(broker.url, {
          clientId: `ucw_${this.opts.selfId}_${Math.random().toString(36).slice(2, 8)}`,
          clean: true,
          // Phones throttle timers in background tabs, which makes a short
          // keepalive look like a dead connection. 60s rides that out.
          keepalive: 60,
          reconnectPeriod: 3000,
          connectTimeout: TRANSPORT.connectTimeoutMs,
          will: {
            topic: this.outTopic,
            payload: willPayload as unknown as Buffer,
            qos: 0,
            retain: false,
          },
        });

        this.clients.set(broker.id, client);

        client.on("connect", () => {
          if (this.stopped) return;
          client.subscribe(this.inTopic, { qos: 0 }, (err) => {
            if (err) {
              console.warn(`[relay] subscribe failed on ${broker.id}:`, err);
              return;
            }
            this.connected.add(broker.id);
            this.setStatus("connected");
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        client.on("message", (_topic, payload) => {
          void this.handlePayload(new Uint8Array(payload));
        });

        client.on("close", () => {
          this.connected.delete(broker.id);
          if (!this.stopped && settled) {
            this.setStatus(this.connected.size > 0 ? "connected" : "reconnecting");
          }
        });

        client.on("error", (err) => {
          failures.push(`${broker.id}: ${err?.message ?? err}`);
          console.warn(`[relay] ${broker.id} error:`, err?.message ?? err);
          this.connected.delete(broker.id);
          if (!this.stopped && settled) {
            this.setStatus(this.connected.size > 0 ? "connected" : "reconnecting");
          }
        });
      }
    });

    this.startHeartbeat();
    this.startReaper();
    this.watchVisibility();
  }

  private envelope(type: string, data: unknown): Envelope {
    return {
      id: `${this.opts.selfId}.${this.nonce}:${++this.seq}`,
      from: this.opts.selfId,
      role: this.opts.role,
      type,
      data,
      ts: Date.now(),
    };
  }

  /** Publish to every live broker. Order is preserved via a promise chain. */
  send(type: string, data: unknown = {}): void {
    if (this.stopped || !this.room) return;
    const env = this.envelope(type, data);
    this.sendChain = this.sendChain
      .then(async () => {
        const packed = await encryptJson(this.room!, env);
        for (const [id, client] of this.clients) {
          // Both checks: mqtt's own flag, and what we last saw happen.
          if (!client.connected || !this.connected.has(id)) continue;
          try {
            client.publish(this.outTopic, packed as unknown as Buffer, { qos: 0 });
          } catch (err) {
            console.warn(`[relay] publish failed on ${id}:`, err);
          }
        }
      })
      .catch((err) => console.error("[relay] send failed:", err));
  }

  private async handlePayload(payload: Uint8Array): Promise<void> {
    if (this.stopped || !this.room) return;

    const env = await decryptJson<Envelope>(this.room, payload);
    // Not ours: different room on a shared topic, or plain noise.
    if (!env || typeof env.id !== "string" || typeof env.type !== "string") return;
    if (env.from === this.opts.selfId) return;

    // Same message arriving via a second broker.
    if (this.seen.has(env.id)) return;
    this.seen.add(env.id);
    this.seenOrder.push(env.id);
    if (this.seenOrder.length > TRANSPORT.seenCacheSize) {
      const drop = this.seenOrder.shift();
      if (drop) this.seen.delete(drop);
    }

    this.lastSeen.set(env.role === "host" ? HOST_PEER : env.from, Date.now());
    if (env.role === "host") this.sawHost = true;

    if (env.type === "LEAVE") {
      this.lastSeen.delete(env.role === "host" ? HOST_PEER : env.from);
    }

    this.opts.onMessage({
      type: env.type,
      from: env.from,
      role: env.role,
      data: env.data,
    });
  }

  /**
   * Coming back from a locked screen or a background tab, sockets are often
   * dead without having told anyone. Nudge them awake and announce ourselves
   * immediately rather than waiting out a heartbeat interval.
   */
  private watchVisibility(): void {
    if (typeof document === "undefined") return;
    this.onVisibility = () => {
      if (this.stopped || document.visibilityState !== "visible") return;
      for (const client of this.clients.values()) {
        if (!client.connected && !client.reconnecting) {
          try {
            client.reconnect();
          } catch {
            /* it will retry on its own schedule */
          }
        }
      }
      this.send("PING", this.opts.heartbeatData?.() ?? {});
    };
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private startHeartbeat(): void {
    const beat = () => {
      if (this.stopped) return;
      this.send("PING", this.opts.heartbeatData?.() ?? {});
    };
    beat();
    this.heartbeatTimer = setInterval(beat, TRANSPORT.heartbeatMs);
  }

  private startReaper(): void {
    this.reaperTimer = setInterval(() => {
      if (this.stopped) return;
      const now = Date.now();

      if (this.opts.role === "host") {
        for (const [peerId, at] of this.lastSeen) {
          if (now - at > TRANSPORT.peerTimeoutMs) {
            this.lastSeen.delete(peerId);
            this.opts.onPeerTimeout?.(peerId);
          }
        }
        return;
      }

      // Client: watch the host, but only once we have actually heard from it.
      if (!this.sawHost) return;
      const hostAt = this.lastSeen.get(HOST_PEER);
      if (hostAt && now - hostAt > TRANSPORT.peerTimeoutMs) {
        this.lastSeen.delete(HOST_PEER);
        this.opts.onPeerTimeout?.(HOST_PEER);
      }
    }, 2000);
  }

  /** Tell the room we are leaving, then tear everything down. */
  stop(announce = true): void {
    if (this.stopped) return;

    if (announce && this.room) {
      // Fire and forget: publish synchronously where we can, then disconnect.
      const env = this.envelope("LEAVE", {});
      void encryptJson(this.room, env)
        .then((packed) => {
          for (const client of this.clients.values()) {
            if (client.connected) {
              try {
                client.publish(this.outTopic, packed as unknown as Buffer, { qos: 0 });
              } catch {
                /* going away anyway */
              }
            }
          }
        })
        .finally(() => this.teardown());
      this.stopped = true;
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      if (this.reaperTimer) clearInterval(this.reaperTimer);
      return;
    }

    this.stopped = true;
    this.teardown();
  }

  private teardown(): void {
    if (this.onVisibility && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibility);
      this.onVisibility = null;
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reaperTimer) clearInterval(this.reaperTimer);
    this.heartbeatTimer = null;
    this.reaperTimer = null;
    for (const client of this.clients.values()) {
      try {
        client.end(true);
      } catch {
        /* ignore */
      }
    }
    this.clients.clear();
    this.connected.clear();
  }

  private setStatus(status: RelayStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.opts.onStatusChange?.(status, this.connectedBrokers);
  }
}
