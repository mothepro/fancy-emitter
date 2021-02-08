import SafeEmitter from './SafeEmitter.js'
import type { Broadcaster, Listener, OneArgFn } from './types'

/** Reject an event with this error to gracefully end next iteration. */
export class CancelledEvent extends Error {
  message = 'Cancelled emitter gracefully'
}

/** Swallows cancelled errors, rethrows all other errors. */
export function throwError(err: Error): asserts err is CancelledEvent {
  if (!(err instanceof CancelledEvent))
    throw err
}

export default class <T = void> extends SafeEmitter<T> implements Broadcaster<T>, Listener<T> {
  get [Symbol.toStringTag]() { return 'Emitter' }

  /** Whether this emitter can still be activated, or deactived. */
  get isAlive() { return !!this.resolve }

  /** Triggers an error and stops handling events. */
  readonly deactivate = (err: Error) => {
    if (this.resolve) {
      this.resolve(Promise.reject(err))
      delete this.resolve
    }
    return this
  }

  /** Gracefully stops handling events. */
  readonly cancel = () => this.deactivate(new CancelledEvent)

  /** 
   * Calls `fn` the next time this is activated.
   * Throws if it is deactivated, NOOP if it is cancelled.
   */
  // Can't just add a .catch to the `next` since if awaited, it must resolve to something...
  readonly once = async (fn: OneArgFn<T>) => super.once(fn).catch(throwError)

  // Chain 2 more passthrus since the aysncIterator's `yield*` cost 2 microticks.
  // One for `yield` and again for the 'special passthru yield' (`yield*`)
  get next() { return super.next.then().then() }

  /**
   * Dequeues a promise and yields it so it may be awaited on.
   * A pending promise is enqueued everytime one is resolved.
   * Gracefully catches if any errors are thrown.
   */
  async*[Symbol.asyncIterator]() {
    try {
      yield* super[Symbol.asyncIterator]()
    } catch (err) {
      throwError(err)
    }
  }
}
