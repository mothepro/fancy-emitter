// `.js` is required. https://github.com/Microsoft/TypeScript/issues/13422
import SafeEmitter, { OneArgFn } from './SafeEmitter.js'

/** Function which takes an error. */
type ErrFn = (err: Error) => void

/** Reject an event with this error to gracefully end next iteration. */
class CancelledEvent extends Error {
    message = 'Cancelled emitter gracefully'
}

/** Swallows cancelled errors, rethrows all other errors. */
function throwError(err: Error): never | void {
    if (!(err instanceof CancelledEvent))
        throw err
}

export default class <T = void> extends SafeEmitter<T> {

    /** Triggers an error and stops handling events. */
    deactivate(err: Error) {
        if (this.resolve) {
            this.resolve(Promise.reject(err))
            delete this.resolve
        }
        return this
    }

    /** Gracefully stops handling events. */
    cancel() {
        return this.deactivate(new CancelledEvent)
    }

    /**
     * Dequeues a promise and yields it so it may be awaited on.
     * A pending promise is enqueued everytime one is resolved.
     * Gracefully catches if any errors are thrown.
     */
    async* [Symbol.asyncIterator]() {
        try {
            yield* super[Symbol.asyncIterator]()
        } catch (err) {
            throwError(err)
        }
    }

    /**
     * Calls `fn` the next time this is activated.
     * 
     * @param fn The function to be called once this is activated.
     * @param errFn A function to be called if this is deactivated instead of
     *  cancelled. By default `Error`'s are swallowed, otherwise the async function
     *  called within would cause an `UnhandledPromiseRejection`.
     * @returns a `Function` to cancel *this* specific listener.
     */
    onceCancellable(fn: OneArgFn<T>, errFn: ErrFn = () => { }) {
        let killer: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new CancelledEvent))

        Promise.race([this.next, rejector])
            .then(fn)
            .catch(throwError)
            .catch(errFn)

        return killer!
    }
    
    /**
     * Calls a function every time this is activated.
     * Stops after a cancellation or deactivation.
     * 
     * @param fn The function to be called once the emitter is activated.
     * @param errFn A function to be called if the emitter is deactivated instead of
     *  cancelled. By default `Error`'s are swallowed, otherwise the async function
     *  called within would cause an `UnhandledPromiseRejection`.
     * @returns a `Function` to cancel *this* specific listener at
     *  the end of the current thread. Note: Activations have priority over this canceller.
     */
    // TODO: Optimize this by having listening on the async iterable instead of cloning.
    onCancellable(fn: OneArgFn<T>, errFn: ErrFn = () => { }): () => this {
        const clone = new exports.default
        clone.on(fn).catch(errFn)
        this.on(clone.activate).catch(clone.deactivate)
        return clone.cancel
    }
}
