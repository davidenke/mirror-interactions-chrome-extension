// despite blacklisting the constantly growing amount of internal protocols
// (chrome://, arc://, edge://, ...), we're actively allowing the following
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'ftp:', 'file:'] as const;
export type AllowedProtocol = (typeof ALLOWED_PROTOCOLS)[number];

export const SYNC_MODE = ['off', 'send', 'receive'] as const;
export type SyncMode = (typeof SYNC_MODE)[number];

export const MIRROR_EVENTS: Array<keyof DocumentEventMap> = ['click', 'keydown', 'keyup', 'scroll'];

// Mirror Interactions Chrome Extension
export const SCOPE = 'mice';

type MessageShape<T extends string, P extends object> = Readonly<{
  type: Prefixed<T>;
  payload: P;
}>;

export const PREFIX = 'MICE_' as const;
export type Prefixed<T extends string> = `${typeof PREFIX}${T}`;
export type Unfixed<T extends string> = T extends `${typeof PREFIX}${infer P}` ? P : never;
export const prefix = <T extends Unfixed<Message['type']>>(t: T): Prefixed<T> => `${PREFIX}${t}`;

export type CursorPosition = MessageShape<'CursorPosition', { x: number; y: number }>;
export type ClickOrTouch = MessageShape<'ClickOrTouch', { x: number; y: number }>;
export type Wheel = MessageShape<'Wheel', { x: number; y: number; dx: number; dy: number }>;

export type Message = CursorPosition | ClickOrTouch | Wheel;
