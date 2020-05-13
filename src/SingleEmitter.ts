import { OneArgFn, SingleBroadcaster, SingleListener, ErrFn } from './types'
import { CancelledEvent, throwError } from './Emitter.js'
import SafeSingleEmitter from './SafeSingleEmitter.js'

/** An Emitter for just a single event. */
export default class <T = void> extends SafeSingleEmitter<T> implements SingleListener<T>, SingleBroadcaster<T> {
  get [Symbol.toStringTag]() { return 'SingleEmitter' }

  /**
   * Resolves when activated. Rejected when deactivated or cancelled.
   * Do not rely on this if using cancellations, use the `once` method.
   */
  readonly event!: Promise<T>

  /** Triggers an error and stops handling events. */
  readonly deactivate = (err: Error) => !this.triggered && this.activate(Promise.reject(err) as unknown as T)

  /** Gracefully stops handling events. */
  readonly cancel = () => this.deactivate(new CancelledEvent)

  /** 
   * Calls `fn` if this is activated.
   * Throws if it is deactivated, NOOP if it is cancelled.
   * 
   * Add a `.catch` call to handle deactivations.
   * Example: ```js
   *  this.once(console.log).catch(console.error)
   * ```
   */
  once(fn: OneArgFn<T>) {
    return super.once(fn).catch(throwError)
  }
}
