import { describe, it, expect, vi } from 'vitest';
import { LishopEventBus, LishopEvent } from '../event-bus';

describe('LishopEventBus', () => {
  it('delivers AUTH_LOGIN payload to subscriber', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.AUTH_LOGIN, handler);
    bus.emit(LishopEvent.AUTH_LOGIN, { userId: 'u1', role: 'CUSTOMER' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u1', role: 'CUSTOMER' });
  });

  it('delivers CART_UPDATED payload to subscriber', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.CART_UPDATED, handler);
    bus.emit(LishopEvent.CART_UPDATED, { itemCount: 3 });
    expect(handler).toHaveBeenCalledWith({ itemCount: 3 });
  });

  it('does not call handler after off()', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.AUTH_LOGOUT, handler);
    bus.off(LishopEvent.AUTH_LOGOUT, handler);
    bus.emit(LishopEvent.AUTH_LOGOUT, undefined);
    expect(handler).not.toHaveBeenCalled();
  });
});
