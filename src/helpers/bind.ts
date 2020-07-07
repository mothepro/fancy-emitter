import SafeEmitter from '../SafeEmitter.js'
import Emitter from '../Emitter.js'

type Key = string | number | symbol

interface ClassicEmitter {
  addEventListener(type: Key, listener: (this: this, ev: Key) => any): void
  addEventListener(type: Key, listener: (this: this, ev: Key) => any, ...options: any[]): void
}

export default function (emitter: ClassicEmitter, ...keys: Key[]) {
  const safe = new SafeEmitter
  for (const key of keys)
    emitter.addEventListener(key, safe.activate)
  return safe
}

export function bindOptions(emitter: ClassicEmitter, key: Key, ...options: any[]) {
  const safe = new SafeEmitter
  emitter.addEventListener(key, safe.activate, ...options)
  return safe
}

export function bindCatchErrors(emitter: ClassicEmitter, key: Key, ...options: any[]) {
  const unsafe = new Emitter
  emitter.addEventListener(key, unsafe.activate, ...options)
  emitter.addEventListener('error', unsafe.deactivate as any, ...options)
  return unsafe
}
