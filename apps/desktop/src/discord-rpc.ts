import * as net from 'node:net';
import * as path from 'node:path';
import * as os from 'node:os';

export interface PresenceActivity {
  details?: string;
  state?: string;
  startTimestamp?: number;
}

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

const DEFAULT_CLIENT_ID = '1553668102376525845';
const MIN_FLUSH_MS = 10000;
const MAX_TEXT = 128;

function clamp(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const value = text.trim();
  if (!value) return undefined;
  return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT - 1)}…` : value;
}

export class DiscordPresence {
  private clientId = '';
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);
  private ready = false;
  private stopped = true;
  private connecting = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 5000;
  private lastSentAt = 0;
  private lastSentKey = '';
  private pending: PresenceActivity | null = null;
  private nonce = 0;

  start(): void {
    this.clientId = (process.env.CUTEPAD_DISCORD_CLIENT_ID ?? '').trim() || DEFAULT_CLIENT_ID;
    if (!this.clientId) return;
    this.stopped = false;
    this.reconnectDelay = 5000;
    this.connect(0);
  }

  update(activity: PresenceActivity | null): void {
    this.pending = activity;
    if (this.stopped) return;
    const elapsed = Date.now() - this.lastSentAt;
    if (this.ready && elapsed >= MIN_FLUSH_MS) {
      this.flush();
      return;
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, Math.max(500, MIN_FLUSH_MS - elapsed));
  }

  stop(): void {
    this.stopped = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    this.ready = false;
    socket?.destroy();
  }

  private pipePaths(): string[] {
    const paths: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      if (process.platform === 'win32') {
        paths.push(`\\\\.\\pipe\\discord-ipc-${i}`);
      } else {
        const base =
          process.env.XDG_RUNTIME_DIR ||
          process.env.TMPDIR ||
          process.env.TMP ||
          os.tmpdir();
        paths.push(path.join(base, `discord-ipc-${i}`));
      }
    }
    return paths;
  }

  private connect(index: number): void {
    if (this.stopped || this.connecting) return;
    const paths = this.pipePaths();
    if (index >= paths.length) {
      this.scheduleReconnect();
      return;
    }
    this.connecting = true;
    const socket = net.createConnection(paths[index]);
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    let opened = false;

    socket.on('connect', () => {
      opened = true;
      this.connecting = false;
      this.send(OP_HANDSHAKE, { v: 1, client_id: this.clientId });
    });

    socket.on('data', (chunk: Buffer) => this.onData(chunk));

    socket.on('error', () => {
      this.connecting = false;
      socket.destroy();
      if (!opened && !this.stopped) this.connect(index + 1);
    });

    socket.on('close', () => {
      this.connecting = false;
      if (this.socket === socket) this.socket = null;
      this.ready = false;
      if (this.stopped) return;
      if (opened) this.scheduleReconnect();
      else this.connect(index + 1);
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(0);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000);
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 8) {
      const op = this.buffer.readInt32LE(0);
      const length = this.buffer.readInt32LE(4);
      if (length < 0 || length > 4 * 1024 * 1024) {
        this.socket?.destroy();
        return;
      }
      if (this.buffer.length < 8 + length) return;
      const body = this.buffer.subarray(8, 8 + length);
      this.buffer = this.buffer.subarray(8 + length);
      this.onFrame(op, body);
    }
  }

  private onFrame(op: number, body: Buffer): void {
    if (op === OP_PING) {
      let payload: unknown = {};
      try {
        payload = JSON.parse(body.toString('utf-8'));
      } catch {
        /* empty ping */
      }
      this.send(OP_PONG, payload);
      return;
    }
    if (op === OP_CLOSE) {
      this.socket?.destroy();
      return;
    }
    if (op !== OP_FRAME) return;
    try {
      const msg = JSON.parse(body.toString('utf-8')) as { evt?: string | null };
      if (msg.evt === 'READY') {
        this.ready = true;
        this.reconnectDelay = 5000;
        this.lastSentAt = 0;
        this.lastSentKey = '';
        this.flush();
      }
    } catch {
      /* malformed frame */
    }
  }

  private flush(): void {
    if (!this.ready || !this.socket || this.socket.destroyed) return;
    const activity = this.pending;
    const key = JSON.stringify(activity ?? null);
    if (key === this.lastSentKey) return;
    this.lastSentKey = key;
    this.lastSentAt = Date.now();
    const mapped = activity
      ? {
          details: clamp(activity.details),
          state: clamp(activity.state),
          timestamps: activity.startTimestamp
            ? { start: Math.floor(activity.startTimestamp) }
            : undefined,
        }
      : null;
    this.send(OP_FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity: mapped },
      nonce: String((this.nonce += 1)),
    });
  }

  private send(op: number, payload: unknown): void {
    const socket = this.socket;
    if (!socket || socket.destroyed) return;
    try {
      const body = Buffer.from(JSON.stringify(payload), 'utf-8');
      const header = Buffer.alloc(8);
      header.writeInt32LE(op, 0);
      header.writeInt32LE(body.length, 4);
      socket.write(Buffer.concat([header, body]));
    } catch {
      /* write failed; close handler reconnects */
    }
  }
}
