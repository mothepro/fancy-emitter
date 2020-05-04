/** A function which takes an argument if it isn't undefined. */
export type OneArgFn<T, R = void> =
    Extract<T, void> extends never
        ? (arg: T) => R      // T does NOT have void in it
        : Exclude<T, void> extends never
            ? () => R        // T is ONLY void
            : (arg?: T) => R // T is a combination of void and non void

export interface SafeBroadcaster<T = void> {
  activate: OneArgFn<T, this>
}

export interface Broadcaster<T = void> extends SafeBroadcaster<T> {
  deactivate(err: Error): this
  cancel(): this
}

export interface SafeListener<T = void> extends AsyncIterable<T> {
  // Resolves when event is activated.
  // Rejects when event is deactivated or cancelled.
  readonly next: Promise<T>
  readonly count: number

  once(fn: OneArgFn<T>): Promise<void>
  on(fn: OneArgFn<T>): Promise<void>
}

export interface Listener<T = void> extends SafeListener<T> {
  onceCancellable(fn: OneArgFn<T>, errFn?: (err: Error) => void): Function
  onCancellable(fn: OneArgFn<T>, errFn?: (err: Error) => void): Function
}
