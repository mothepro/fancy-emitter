export { default as SafeEmitter } from './src/SafeEmitter.js'
export { default as Emitter } from './src/Emitter.js'
export { default as merge } from './src/helpers/merge.js'
export { default as clone } from './src/helpers/clone.js'
export { filter, filterValue } from './src/helpers/filter.js'
export { onceCancellable, onCancellable } from './src/helpers/cancellable.js'
export { default as bind, bindCatchErrors, bindOptions } from './src/helpers/bind.js'
export { default as unbind, unbindCatchErrors, unbindOptions } from './src/helpers/unbind.js'

/** A function which takes an argument iff it's defined. */
export type OneArgFn<T, R = void> =
    Extract<T, void> extends never
        ? (arg: T) => R      // T does NOT have void in it
        : Exclude<T, void> extends never
            ? () => R        // T is ONLY void
            : (arg?: T) => R // T is a combination of void and non void

/** Function which takes an error. */
export type ErrFn = (err: Error) => void

export interface SafeBroadcaster<T = void> {
  readonly activate: OneArgFn<T, this>
}

export interface Broadcaster<T = void> extends SafeBroadcaster<T> {
  deactivate(err: Error): this
  cancel(): this
}

export interface SafeListener<T = void> extends AsyncIterable<T> {
  /** Resolves when event is activated. */
  readonly next: Promise<T>
  readonly count: number

  once(fn: OneArgFn<T>): Promise<void>
  on(fn: OneArgFn<T>): Promise<void>
}

export interface Listener<T = void> extends SafeListener<T> {
  /**
   * Resolves when event is activated.
   * Rejects when event is deactivated or cancelled.
   * 
   * Do **not** rely directly on this if planning to use cancelled functionality.
   */
  readonly next: Promise<T>
  readonly isAlive: boolean
}
