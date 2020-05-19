import type { OneArgFn, SafeSingleBroadcaster, SafeSingleListener } from './types'

/** An Emitter for just a single event. */
// TODO extend a promise directly so the emitter can just be `await`ed on.
export default class <T = void> implements SafeSingleBroadcaster<T>, SafeSingleListener<T> {
  get [Symbol.toStringTag]() { return 'SafeSingleEmitter' }

  private resolve?: Function

  /** Whether the event has been triggered already. */
  get triggered() { return !this.resolve }

  /** Triggers the event. */
  activate = ((arg: T) => this.resolve && (this.resolve(arg) || delete this.resolve)) as OneArgFn<T>

  /** Resolves when this is activated. */
  readonly event = new Promise<T>(resolve => this.resolve = resolve)

  constructor(
    /** Listeners to attach immediately. */
    ...listeners: OneArgFn<T>[]
  ) {
    for (const listener of listeners)
      this.once(listener)
  }

  /** Calls `fn` when this is activated. */
  once(fn: OneArgFn<T>) {
    return this.event.then(fn)
  }
}
