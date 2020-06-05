import type { SingleBroadcaster, SingleListener, ErrFn } from './types'
import { CancelledEvent } from './Emitter.js'
import SafeSingleEmitter from './SafeSingleEmitter.js'

/**
 * An Emitter for just a single event.
 * 
 * Note: When using `await` syntax cancellations **will** throw a `CancelledEvent` error.
 * 
 * For this case the Recommended syntax is as follows:
 * ```
 * new SingleEmitter()
 *   .then(() => console.log('Called when activated'))
 *   .catch(() => console.log('Called when deactivated'))
 *   .finally(() => console.log('Called when activated, deactivated or cancelled'))
 * ```
 */
export default class <T = void> extends SafeSingleEmitter<T> implements SingleListener<T>, SingleBroadcaster<T> {
  get [Symbol.toStringTag]() { return 'SingleEmitter' }

  /** Whether this has been deactivated already. */
  readonly deactivated: boolean = false

  /** Whether this has been cancelled already. */
  readonly cancelled: boolean = false

  private reject(err: Error) {
    if (!this.triggered)
      this.activate(Promise.reject(err) as unknown as T)
    return this
  }

  /** Triggers an error and stops handling events. */
  readonly deactivate = (err: Error) => {
    (this.deactivated as boolean) = true
    return this.reject(err)
  }

  /** Gracefully stops handling events. */
  readonly cancel = () => {
    (this.cancelled as boolean) = true
    return this.reject(new CancelledEvent)
  }
  
  // @ts-ignore This should be cast to be stricter
  catch(fn: ErrFn = () => { }) {
    return super.catch(error => {
      if (!(error instanceof CancelledEvent))
        fn(error)
    })
  }
}
