/** A function which takes an argument if it isn't undefined. */
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
   * Don't rely directly on this if planning to use cancelled functionality.
   */
  readonly next: Promise<T>
}

export interface SafeSingleListener<T = void> {
  readonly triggered: boolean
  readonly event: Promise<T>
  once(fn: OneArgFn<T>): Promise<void>
}

export interface SafeSingleBroadcaster<T = void> {
  readonly activate: OneArgFn<T>
}

export interface SingleListener<T = void> extends SafeSingleListener<T> {
  readonly triggered: boolean
  once(fn: OneArgFn<T>): Promise<void>
}

export interface SingleBroadcaster<T = void> extends SafeSingleBroadcaster<T> {
  deactivate(err: Error): void
  cancel(): void
}
