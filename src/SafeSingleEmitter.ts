import { OneArgFn } from './types'

/** An Emitter for just a single event. */
export default class <T = void> {
  /** Triggers the event. */
  activate!: OneArgFn<T>

  /** Resolves when this is activated. */
  readonly event = new Promise<T>(r => this.activate = r as OneArgFn<T>)

  /** Calls `fn` when this is activated. */
  async once(fn: OneArgFn<T>) {
    fn(await this.event)
  }
}
