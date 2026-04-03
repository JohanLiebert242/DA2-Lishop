export { LishopEventBus, LishopEvent } from './event-bus';
export type { LishopEventPayloads } from './events';

import { LishopEventBus } from './event-bus';
export const eventBus = new LishopEventBus();
