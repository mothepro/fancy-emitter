import { OneArgFn } from './types'

/** An Emitter for just a single event. */
export default class <T = void> {
  private resolve!: Function

  /** Whether the event has been triggered already. */
  readonly triggered: boolean = false

  /** Triggers the event. */
  activate = ((arg: T) => {
    // Do not chain promises since this should be updated ASAP
    (this.triggered as boolean) = true // simple override
    this.resolve(arg)
  }) as OneArgFn<T>

  /** Resolves when this is activated. */
  readonly event = new Promise<T>(resolve => this.resolve = resolve)

  constructor(
    /**
     * Listeners to attach immediately.
     * Errors thrown will be ignored, as to not throw Unhandled promise exceptions.
     */
    ...listeners: OneArgFn<T>[]
  ) {
    for (const listener of listeners)
      this.once(listener).catch(() => { })
  }

  /** Calls `fn` when this is activated. */
  async once(fn: OneArgFn<T>) {
    fn(await this.event)
  }
}
