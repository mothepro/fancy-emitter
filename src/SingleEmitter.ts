import { OneArgFn } from './types'
import { CancelledEvent, throwError } from './Emitter.js'
import SafeSingleEmitter from './SafeSingleEmitter.js'

/** An Emitter for just a single event. */
export default class <T = void> extends SafeSingleEmitter<T> {
  get [Symbol.toStringTag]() { return 'SingleEmitter' }

  /** Triggers an error and stops handling events. */
  readonly deactivate = (err: Error) => this.activate(Promise.reject(err) as unknown as T)

  /** Gracefully stops handling events. */
  readonly cancel = () => this.deactivate(new CancelledEvent)

  /** 
   * Calls `fn` the next time this is activated.
   * Throws if it is deactivated, NOOP if it is cancelled.
   */
  async once(fn: OneArgFn<T>) {
    return super.once(fn).catch(throwError)
  }
}
