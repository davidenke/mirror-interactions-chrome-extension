import type { KeyInput } from 'puppeteer-core';

// despite blacklisting the constantly growing amount of internal protocols
// (chrome://, arc://, edge://, ...), we're actively allowing the following
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'ftp:', 'file:'] as const;
export type AllowedProtocol = (typeof ALLOWED_PROTOCOLS)[number];

export const COMMAND_KEYS = ['Enter', 'Backspace', 'Tab'] as const satisfies KeyInput[];
export type CommandKey = (typeof COMMAND_KEYS)[number];

export const SYNC_MODE = ['off', 'send', 'receive'] as const;
export type SyncMode = (typeof SYNC_MODE)[number];

// Mirror Interactions Chrome Extension
export const PREFIX = 'MICE_' as const;
export type Prefixed<T extends string> = `${typeof PREFIX}${T}`;
export type Unfixed<T extends string> = T extends `${typeof PREFIX}${infer P}` ? P : never;
export const prefixed = <T extends Unfixed<Message['type']>>(t: T): Prefixed<T> => `${PREFIX}${t}`;

type MessageShape<T extends string, P extends object | undefined> = {
  type: Prefixed<T>;
  payload: P extends object ? P : undefined;
};

export type Mode = MessageShape<'Mode', { mode: SyncMode }>;
export type Which = MessageShape<'Which', undefined>;

export type Click = MessageShape<'Click', { x: number; y: number; count: number }>;
export type Cursor = MessageShape<'Cursor', { x: number; y: number }>;
export type KeyCmd = MessageShape<
  'KeyCmd',
  { key: CommandKey; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }
>;
export type KeyPress = MessageShape<'KeyPress', { key: KeyInput }>;
export type Wheel = MessageShape<'Wheel', { x: number; y: number; dx: number; dy: number }>;

export type Test = KeyPress | Mode | Wheel;
export type Message = Click | Cursor | KeyCmd | KeyPress | Mode | Wheel | Which;
