import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useGame } from "./GameContext";
import { useSound } from "./SoundContext";
import { GameState } from "../types/game";
import { HOST_PEER, RelayClient, RelayStatus } from "@/lib/relay";
import { generateRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/roomCode";
import { TRANSPORT } from "@/config/transport";

/**
 * Multiplayer wiring.
 *
 * Still host-authoritative: the host owns the game state and everyone else
 * sends intents and renders what the host sends back. What changed is the
 * pipe underneath -- an encrypted relay over public MQTT brokers instead of
 * WebRTC peer connections, so players on different networks can actually
 * reach each other (see src/lib/relay.ts).
 *
 * Reliability extras that the old peer-to-peer version lacked:
 *   - state is versioned, and a peer whose version falls behind gets a
 *     resend, so a dropped message heals itself within a heartbeat
 *   - identity survives a page refresh, so reloading rejoins the same seat
 *   - joining fails loudly, with a reason, instead of hanging forever
 */

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

interface PeerContextType {
  peer: { id: string } | null;
  hostId: string | null;
  isHost: boolean;
  status: ConnectionStatus;
  isBusy: boolean;
  hostGame: (username: string) => void;
  joinGame: (roomCode: string, username: string) => void;
  leaveGame: () => void;
  sendGameState: (state: GameState) => void;
  sendToHost: (data: Record<string, unknown>) => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

const SELF_ID_KEY = "ucw:self-id";
const REJOIN_KEY = "ucw:rejoin";

type Rejoin = { code: string; username: string };

function readRejoin(): Rejoin | null {
  try {
    const raw = sessionStorage.getItem(REJOIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Rejoin;
    return parsed?.code && parsed?.username ? parsed : null;
  } catch {
    return null;
  }
}

function writeRejoin(value: Rejoin | null): void {
  try {
    if (value) sessionStorage.setItem(REJOIN_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(REJOIN_KEY);
  } catch {
    /* private mode: auto-rejoin just won't be available */
  }
}

/** Stable per-tab identity, so a refresh keeps your seat at the table. */
function getSelfId(): string {
  try {
    const existing = sessionStorage.getItem(SELF_ID_KEY);
    if (existing) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const id = Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 10);
    sessionStorage.setItem(SELF_ID_KEY, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
  const { playSound } = useSound();
  const { t } = useTranslation();
  const {
    gameState,
    setGameState,
    addPlayer,
    removePlayer,
    submitMrWhiteGuess,
    submitVote,
    submitDescription,
  } = useGame();

  const [selfId] = useState(getSelfId);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isBusy, setIsBusy] = useState(false);

  const relayRef = useRef<RelayClient | null>(null);
  const isHostRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const stateVersionRef = useRef(0);
  const appliedVersionRef = useRef(0);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinWaiterRef = useRef<(() => void) | null>(null);
  const graceTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /**
   * Connection attempts are async and a provider can remount under them
   * (React's development double-mount, a route change). Each attempt carries
   * a generation; if it is no longer current when an await returns, the
   * attempt quietly abandons its own relay instead of tearing down whatever
   * replaced it.
   */
  const attemptRef = useRef(0);

  // Handlers run inside relay callbacks that outlive a render, so the latest
  // game state has to be reachable through a ref rather than a closure.
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const teardown = useCallback((announce = true) => {
    attemptRef.current += 1;
    for (const timer of graceTimersRef.current.values()) clearTimeout(timer);
    graceTimersRef.current.clear();
    relayRef.current?.stop(announce);
    relayRef.current = null;
    isHostRef.current = false;
    stateVersionRef.current = 0;
    appliedVersionRef.current = 0;
    if (broadcastTimerRef.current) {
      clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    setHostId(null);
    setIsHost(false);
    setStatus("idle");
  }, []);

  const broadcastState = useCallback((state: GameState) => {
    const relay = relayRef.current;
    if (!relay || !isHostRef.current) return;
    stateVersionRef.current += 1;
    relay.send("GAME_STATE", { state, v: stateVersionRef.current });
  }, []);

  const onStatusChange = useCallback(
    (relayStatus: RelayStatus) => {
      setStatus(relayStatus as ConnectionStatus);
      if (relayStatus === "reconnecting") toast.warning(t("peer.reconnecting"));
      if (relayStatus === "connected" && relayRef.current) {
        // Back online: push the truth out again so nobody is left stale.
        if (isHostRef.current) broadcastState(gameStateRef.current);
      }
    },
    [broadcastState, t],
  );

  /* ---------------------------------------------------------------- host */

  /**
   * Someone stopped answering. In the lobby that is just churn, so drop them.
   * Mid-round it is usually a reload or a phone locking its screen, and
   * eliminating them would both spoil their game and can even end the round
   * early -- so hold their seat, and their word, for a grace period.
   */
  const handleDeparture = useCallback(
    (peerId: string) => {
      const player = gameStateRef.current.players.find((p) => p.id === peerId);
      if (!player) return;

      const drop = () => {
        graceTimersRef.current.delete(peerId);
        if (!gameStateRef.current.players.some((p) => p.id === peerId)) return;
        removePlayer(peerId);
        toast.error(t("peer.playerDisconnected", { name: player.name }));
      };

      if (gameStateRef.current.phase === "setup") {
        drop();
        return;
      }

      if (graceTimersRef.current.has(peerId)) return;
      toast.warning(t("peer.playerReconnecting", { name: player.name }));
      graceTimersRef.current.set(
        peerId,
        setTimeout(drop, TRANSPORT.disconnectGraceMs),
      );
    },
    [removePlayer, t],
  );

  const handleHostMessage = useCallback(
    (msg: { type: string; from: string; data: unknown }) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;

      // They are talking again, so cancel any pending removal.
      const pendingDrop = graceTimersRef.current.get(msg.from);
      if (pendingDrop && msg.type !== "LEAVE") {
        clearTimeout(pendingDrop);
        graceTimersRef.current.delete(msg.from);
        const player = gameStateRef.current.players.find((p) => p.id === msg.from);
        if (player) toast.success(t("peer.playerReturned", { name: player.name }));
      }

      switch (msg.type) {
        case "JOIN_GAME": {
          const known = gameStateRef.current.players.some((p) => p.id === msg.from);
          if (known) {
            // A refresh or a reconnect: same seat, just resend the state.
            broadcastState(gameStateRef.current);
            break;
          }
          playSound("/sounds/player-joined.mp3");
          addPlayer(String(data.username ?? t("peer.unknownPlayer")), msg.from);
          break;
        }
        case "PING": {
          // Heal anyone who missed a broadcast.
          const theirVersion = Number(data.v ?? 0);
          if (theirVersion < stateVersionRef.current) {
            broadcastState(gameStateRef.current);
          }
          break;
        }
        case "SUBMIT_VOTE":
          // Trust the envelope's sender, not a client-supplied id.
          submitVote(msg.from, String(data.targetId));
          break;
        case "SUBMIT_DESCRIPTION":
          submitDescription(msg.from, String(data.description ?? ""));
          break;
        case "MR_WHITE_GUESS":
          submitMrWhiteGuess(String(data.guess ?? ""));
          break;
        case "LEAVE":
          handleDeparture(msg.from);
          break;
        default:
          console.debug("[peer] unhandled message from client:", msg.type);
      }
    },
    [
      addPlayer,
      broadcastState,
      handleDeparture,
      playSound,
      submitDescription,
      submitMrWhiteGuess,
      submitVote,
      t,
    ],
  );

  const hostGame = useCallback(
    async (username: string) => {
      if (relayRef.current || isBusy) return;

      const code = generateRoomCode();
      const attempt = ++attemptRef.current;
      writeRejoin(null);
      setIsBusy(true);
      setStatus("connecting");

      const relay = new RelayClient({
        code,
        role: "host",
        selfId,
        onMessage: handleHostMessage,
        onStatusChange,
        heartbeatData: () => ({ v: stateVersionRef.current }),
        onPeerTimeout: handleDeparture,
      });

      relayRef.current = relay;
      isHostRef.current = true;

      try {
        await relay.start();
        if (attemptRef.current !== attempt) {
          relay.stop(false);
          return;
        }
        setIsHost(true);
        setHostId(code);
        addPlayer(username, selfId);
        toast.success(t("peer.gameHosted", { id: code }));
      } catch (err) {
        console.error("[peer] hosting failed:", err);
        if (attemptRef.current === attempt) {
          teardown(false);
          toast.error(t("peer.relayUnreachable"));
        }
      } finally {
        if (attemptRef.current === attempt) setIsBusy(false);
      }
    },
    [
      addPlayer,
      handleDeparture,
      handleHostMessage,
      isBusy,
      onStatusChange,
      selfId,
      t,
      teardown,
    ],
  );

  /* -------------------------------------------------------------- client */

  const handleClientMessage = useCallback(
    (msg: { type: string; from: string; role: string; data: unknown }) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;

      switch (msg.type) {
        case "GAME_STATE": {
          const version = Number(data.v ?? 0);
          // Three brokers means messages can arrive out of order.
          if (version && version < appliedVersionRef.current) return;
          appliedVersionRef.current = version;
          setGameState(data.state as GameState);
          if (joinWaiterRef.current) {
            joinWaiterRef.current();
            joinWaiterRef.current = null;
          }
          break;
        }
        case "LEAVE": {
          if (msg.role !== "host") break;
          toast.error(t("peer.hostClosedConnection"));
          writeRejoin(null);
          teardown(false);
          break;
        }
        case "PING":
          break;
        default:
          console.debug("[peer] unhandled message from host:", msg.type);
      }
    },
    [setGameState, t, teardown],
  );

  const joinGame = useCallback(
    async (rawCode: string, username: string) => {
      if (relayRef.current || isBusy) return;

      const code = normalizeRoomCode(rawCode);
      if (code.length !== ROOM_CODE_LENGTH) {
        toast.error(t("peer.invalidCode", { length: ROOM_CODE_LENGTH }));
        return;
      }

      const attempt = ++attemptRef.current;
      setIsBusy(true);
      setStatus("connecting");

      const relay = new RelayClient({
        code,
        role: "client",
        selfId,
        onMessage: handleClientMessage,
        onStatusChange,
        heartbeatData: () => ({ v: appliedVersionRef.current }),
        onPeerTimeout: (peerId) => {
          if (peerId !== HOST_PEER) return;
          setStatus("reconnecting");
          toast.warning(t("peer.hostUnreachable"));
        },
      });

      relayRef.current = relay;
      isHostRef.current = false;

      try {
        await relay.start();
      } catch (err) {
        console.error("[peer] join failed, no broker:", err);
        if (attemptRef.current !== attempt) return;
        teardown(false);
        toast.error(t("peer.relayUnreachable"));
        setIsBusy(false);
        return;
      }

      if (attemptRef.current !== attempt) {
        relay.stop(false);
        return;
      }

      // The host answers a JOIN_GAME with the full state. Repeat the request
      // while we wait: these are fire-and-forget messages, and the host may
      // still have been connecting when the first one went out.
      const joined = new Promise<void>((resolve) => {
        joinWaiterRef.current = resolve;
      });

      let attempts = 0;
      relay.send("JOIN_GAME", { username });
      const retry = setInterval(() => {
        attempts += 1;
        if (attempts > 5) return;
        relay.send("JOIN_GAME", { username });
      }, 3000);

      const timeout = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), TRANSPORT.joinTimeoutMs),
      );

      const result = await Promise.race([joined.then(() => "joined" as const), timeout]);
      clearInterval(retry);
      if (attemptRef.current !== attempt) {
        relay.stop(false);
        return;
      }
      joinWaiterRef.current = null;
      setIsBusy(false);

      if (result === "timeout") {
        console.warn("[peer] no answer from host for room", code);
        writeRejoin(null);
        teardown(false);
        toast.error(t("peer.roomNotFound", { code }));
        return;
      }

      // Remember the seat so an accidental refresh can walk straight back in.
      writeRejoin({ code, username });
      setHostId(code);
      setIsHost(false);
      toast.success(t("peer.connected"));
    },
    [handleClientMessage, isBusy, onStatusChange, selfId, t, teardown],
  );

  /* ---------------------------------------------------------------- misc */

  const leaveGame = useCallback(() => {
    writeRejoin(null);
    teardown(true);
  }, [teardown]);

  const sendGameState = useCallback(
    (state: GameState) => broadcastState(state),
    [broadcastState],
  );

  const sendToHost = useCallback((data: Record<string, unknown>) => {
    const relay = relayRef.current;
    if (!relay || isHostRef.current) {
      console.error("[peer] not connected as a client; cannot send");
      return;
    }
    const { type, ...rest } = data as { type: string };
    relay.send(type, rest);
  }, []);

  // Host: push state on every change, coalescing bursts into one message.
  useEffect(() => {
    if (!isHost || !relayRef.current) return;
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(() => {
      broadcastState(gameState);
    }, TRANSPORT.stateCoalesceMs);
  }, [broadcastState, gameState, isHost]);

  useEffect(() => {
    // A reload -- or iOS quietly reaping a backgrounded tab -- should not cost
    // you your seat: walk back into the same room with the same identity,
    // which the host recognises instead of seating a duplicate player.
    const saved = readRejoin();
    if (saved && !relayRef.current) {
      toast.info(t("peer.rejoining", { code: saved.code }));
      void joinGame(saved.code, saved.username);
    }

    // Say goodbye on tab close so the others see you leave immediately.
    const onUnload = () => relayRef.current?.stop(true);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      attemptRef.current += 1;
      relayRef.current?.stop(false);
      relayRef.current = null;
      joinWaiterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PeerContext.Provider
      value={{
        peer: { id: selfId },
        hostId,
        isHost,
        status,
        isBusy,
        hostGame: (username: string) => void hostGame(username),
        joinGame: (code: string, username: string) => void joinGame(code, username),
        leaveGame,
        sendGameState,
        sendToHost,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export const usePeer = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
};
