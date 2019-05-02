type Fn<T> = (arg: T) => void

/** A function which takes an argument if it isn't undefined. */
type OneArgFn<T> = T extends void ? () => void : Fn<T>

export interface Listener<T = void> {
    readonly next: Promise<T>
    readonly previous: Promise<T>
    readonly all: AsyncIterableIterator<T>
    readonly future: AsyncIterableIterator<T>
    readonly past: AsyncIterableIterator<T>
    readonly count: number

    once(fn: OneArgFn<T>): Promise<void>
    onceCancellable(fn: OneArgFn<T>, errFn?: Fn<Error>): Function
    on(fn: OneArgFn<T>): Promise<void>
    onCancellable(fn: OneArgFn<T>, errFn?: Fn<Error>): Function
    onContinueAfterError(fn: OneArgFn<T>, errFn: Fn<Error>): void
}

export interface Broadcaster<T = void> {
    activate(...arg: Parameters<OneArgFn<T>>): this
    deactivate(err: Error): this
    cancel(): this
}

/** Reject an event with this error to gracefully end next iteration. */
export class CancelledEvent extends Error {
    /** Throws an error if it isn't cancellable. Otherwise, swallows it */
    static throwError(err: Error): never
    static throwError(err: CancelledEvent): void
    static throwError(err: Error) {
        if (!(err instanceof CancelledEvent))
            throw err
    }
}

export default class Emitter<T = void> implements Listener<T>, Broadcaster<T> {

    constructor() {
        this.makePromise()
    }

    private reject!: Function

    private resolve!: Function

    private readonly promises: Promise<T>[] = []

    /**
     * Resolves when event is activated.
     * Rejects when event is deactivated or cancelled.
     */
    get next() { return this.promises[this.count] }

    /**
     * The lastest promise which has completed.
     * Returns `undefined` if this emitter has yet to be activated, or deactived.
     */
    get previous() { return this.promises[this.count - 1] }

    /** Iterator over ALL events, which have occurred and will occur. */
    get all() { return this.promiseGenerator(0) }

    /** Iterator over FUTURE events, which will occur. */
    get future() { return this.promiseGenerator() }

    /**
     * Iterator over PAST events, which have already occurred.
     * This may be useful during testing...
     */
    get past() { return this.promiseGenerator(0, undefined, this.count) }

    /** The number of times this event has been activated or deactivated. */
    get count() { return this.promises.length - 1 }

    /** Triggers an event. */
    public activate(...arg: Parameters<OneArgFn<T>>) {
        this.resolve(...arg)
        this.makePromise()
        return this
    }

    /** Throw an error for the next event. */
    public deactivate(err: Error) {
        this.reject(err)
        this.makePromise()
        return this
    }

    // TODO: Cancel should not create any more promises??
    /** Cancels the next event. */
    public cancel(message?: string) {
        return this.deactivate(new CancelledEvent(message))
    }

    /**
     * Calls a function the next time is activated.
     * 
     * Note: To catch deactivations, add a following `.catch` call after this method.
     */
    public async once(fn: OneArgFn<T>) {
        try {
            fn(await this.next)
        } catch (err) {
            CancelledEvent.throwError(err)
        }
    }

    /**
     * Calls a function the next time an event is activated.
     * 
     * @param fn The function to be called once the emitter is activated.
     * @param errFn A function to be called if the emitter is deactivated instead of
     *  cancelled. By default `Error`'s are swallowed, otherwise the async function
     *  called within would cause an `UnhandledPromiseRejection`.
     * @returns a `Function` to cancel *this* specific listener.
     */
    public onceCancellable(fn: OneArgFn<T>, errFn: Fn<Error> = () => {}) {
        let killer: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new CancelledEvent))
        
        Promise.race([this.next, rejector])
            .then(fn)
            .catch(CancelledEvent.throwError)
            .catch(errFn)

        return killer!
    }

    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     * 
     * Note: To catch deactivations, add a following `.catch` call after this method.
     */
    public async on(fn: OneArgFn<T>) {
        for await (const data of this.future)
            fn(data)
    }

    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     * 
     * @param fn The function to be called once the emitter is activated.
     * @param errFn A function to be called if the emitter is deactivated instead of
     *  cancelled. By default `Error`'s are swallowed, otherwise the async function
     *  called within would cause an `UnhandledPromiseRejection`.
     * @returns a `Function` to cancel *this* specific listener at
     *      the end of the current thread. Activations have priority over canceller.
     */
    public onCancellable(fn: OneArgFn<T>, errFn: Fn<Error> = () => {}) {
        type promiseGenerator = (current: number, racer?: Promise<never>) => AsyncIterableIterator<T>

        let killer!: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new CancelledEvent))

        async function runner(promiseGenerator: promiseGenerator, count: number) {
            try {
                for await (const data of promiseGenerator(count, rejector))
                    fn(data)
            } catch(e) {
                errFn(e)
            }
        }
        
        runner(this.promiseGenerator.bind(this), this.count)

        return () => killer(new CancelledEvent)
    }

    /**
     * Calls a function every time an event is activated.
     * Continues even after a deactivation.
     * However it stops once Cancelled.
     */
    public async onContinueAfterError(fn: OneArgFn<T>, errFn?: Fn<Error>) {
        const eventGenerator = this.promiseGenerator.bind(this)
        async function recursiveEventListener(current: number) {
            try {
                for await (const data of eventGenerator(current)) {
                    fn(data)
                    current++
                }
            } catch (e) {
                if (errFn)
                    errFn(e)
                recursiveEventListener(current + 1)
            }
        }

        recursiveEventListener(this.count)
    }

    private makePromise() {
        this.promises.push(new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        }))
    }

    private async* promiseGenerator(
        current = this.count,
        racer?: Promise<never>,
        stopBefore?: number,
    ): AsyncIterableIterator<T> {
        try {
            if (racer)
                while (true) // earlier promise has priority
                    yield Promise.race([this.promises[current++], racer])
            else
                while (true) {
                    if (current == stopBefore)
                        break
                    yield this.promises[current++]
                }
        } catch (err) {
            CancelledEvent.throwError(err)
        }
    }
}
