/**
 * Transport configuration.
 *
 * The game talks over public MQTT-over-WebSocket brokers instead of
 * peer-to-peer WebRTC. Reason: WebRTC needs a TURN server to get through
 * most home/mobile NATs, and every free no-signup TURN server is now dead.
 * A WSS relay only needs an outgoing HTTPS-style connection, which works on
 * basically any network -- phone data, office wifi, hotel wifi.
 *
 * We connect to ALL brokers at once and publish every message to each of
 * them. Two players only need *one* broker in common to play together, so a
 * broker that is down, blocked by a firewall, or rate limiting us does not
 * break the room.
 */

export type BrokerConfig = {
  id: string;
  url: string;
};

/** Verified reachable public test brokers (no account, no API key). */
const DEFAULT_BROKERS: BrokerConfig[] = [
  { id: "hivemq", url: "wss://broker.hivemq.com:8884/mqtt" },
  { id: "emqx", url: "wss://broker.emqx.io:8084/mqtt" },
  { id: "mosquitto", url: "wss://test.mosquitto.org:8081/" },
];

/**
 * Override with a comma separated list at build time, e.g.
 *   VITE_MQTT_BROKERS="wss://my-broker.example.com:8884/mqtt"
 * Useful if you want your own broker instead of the public ones.
 */
function parseBrokers(raw: string | undefined): BrokerConfig[] | null {
  if (!raw) return null;
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return null;
  return urls.map((url, i) => ({ id: `custom${i + 1}`, url }));
}

export const BROKERS: BrokerConfig[] =
  parseBrokers(import.meta.env.VITE_MQTT_BROKERS as string | undefined) ??
  DEFAULT_BROKERS;

export const TRANSPORT = {
  /** Topic namespace. Change it to isolate your games from other deployments. */
  topicPrefix: (import.meta.env.VITE_TOPIC_PREFIX as string) || "ucw1",
  /** How often every peer announces it is still there. */
  heartbeatMs: 4000,
  /** Drop a player after this long without a heartbeat. */
  peerTimeoutMs: 16000,
  /** Give up on a broker connection attempt after this long. */
  connectTimeoutMs: 12000,
  /**
   * Grace period before a player who vanished mid-round is actually removed.
   * Phones suspend background tabs and reload them; the player is usually
   * back in seconds, and should find their own word still waiting.
   */
  disconnectGraceMs: 45000,
  /** How long a joining player waits for the host to answer. */
  joinTimeoutMs: 20000,
  /** Burst control for host state broadcasts. */
  stateCoalesceMs: 120,
  /** Size of the "already handled" message id cache. */
  seenCacheSize: 500,
} as const;
