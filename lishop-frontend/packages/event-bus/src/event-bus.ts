import { LishopEvent, LishopEventPayloads } from './events';

type Handler<E extends LishopEvent> = (payload: LishopEventPayloads[E]) => void;

const CHANNEL_NAME = 'lishop-events';

export class LishopEventBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = ({ data }: MessageEvent<{ event: LishopEvent; payload: unknown }>) => {
        this.listeners.get(data.event)?.forEach((h) => h(data.payload));
      };
    }
  }

  on<E extends LishopEvent>(event: E, handler: Handler<E>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (...args: unknown[]) => void);
  }

  off<E extends LishopEvent>(event: E, handler: Handler<E>): void {
    this.listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends LishopEvent>(event: E, payload: LishopEventPayloads[E]): void {
    // Fire local listeners in this window first
    this.listeners.get(event)?.forEach((h) => h(payload));
    // Broadcast to other windows/tabs (does not echo back to sender)
    this.channel?.postMessage({ event, payload });
  }

  destroy(): void {
    this.channel?.close();
    this.listeners.clear();
  }
}

export { LishopEvent };
