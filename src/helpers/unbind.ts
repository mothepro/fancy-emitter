import type { SafeBroadcaster, Broadcaster } from '../types.js'

type Key = string | number | symbol

interface ClassicEmitter {
  removeEventListener(type: Key, listener: (this: this, ev: Key) => any): void
  removeEventListener(type: Key, listener: (this: this, ev: Key) => any, ...options: any[]): void
}

export default function (emitter: ClassicEmitter, broadcaster: SafeBroadcaster, ...keys: Key[]) {
  for (const key of keys)
    emitter.removeEventListener(key, broadcaster.activate)
}

export function unbindOptions(emitter: ClassicEmitter, broadcaster: SafeBroadcaster, key: Key, ...options: any[]) {
  emitter.removeEventListener(key, broadcaster.activate, ...options)
}

export function unbindCatchErrors(emitter: ClassicEmitter, broadcaster: Broadcaster, key: Key, ...options: any[]) {
  emitter.removeEventListener(key, broadcaster.activate, ...options)
  emitter.removeEventListener('error', broadcaster.deactivate as any, ...options)
}

