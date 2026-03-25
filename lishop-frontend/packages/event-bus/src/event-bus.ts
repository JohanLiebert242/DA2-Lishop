import { LishopEvent, LishopEventPayloads } from './events';

type Handler<E extends LishopEvent> = (payload: LishopEventPayloads[E]) => void;

export class LishopEventBus {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

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
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export { LishopEvent };
