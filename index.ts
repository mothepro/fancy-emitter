/** A function which takes an argument if it isn't undefined. */
type OneArgFn<T> = T extends void
    ? () => void
    : (arg: T) => void

export interface Listener<T = void> {
    readonly next: Promise<T>
    readonly all: AsyncIterableIterator<T>
    readonly future: AsyncIterableIterator<T>
    readonly past: AsyncIterableIterator<T>
    readonly count: number

    once(fn: OneArgFn<T>): void
    onceCancellable(fn: OneArgFn<T>): Function
    on(fn: OneArgFn<T>): void
    onCancellable(fn: OneArgFn<T>): Function
    onContinueAfterError(fn: OneArgFn<T>, errFn: OneArgFn<Error>): void
}

export interface Broadcaster<T = void> {
    activate(...arg: Parameters<OneArgFn<T>>): this
    deactivate(err: Error): this
    cancel(): this
}

/** Reject an event with this error to gracefully end next iteration. */
export class CancelledEvent extends Error {}

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

    /** Iterator over ALL events, which have occurred and will occur. */
    get all() { return this.promiseGenerator(0) }

    /** Iterator over FUTURE events, which will occur. */
    get future() { return this.promiseGenerator(this.count) }

    /**
     * Iterator over PAST events, which have already occurred.
     * This may be useful during testing...
     */
    get past() { return this.pastGenerator(0, this.count) }

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

    /** Calls a function the next time is activated. */
    public async once(fn: OneArgFn<T>) {
        try {
            fn(await this.next)
        } catch (err) { Emitter.throwError(err) }
    }

    /**
     * Calls a function the next time an event is activated.
     * @returns a `Function` to cancel *this* specific listener.
     */
    public onceCancellable(fn: OneArgFn<T>) {
        let killer: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new CancelledEvent))

        Promise.race([this.next, rejector]).then(fn, Emitter.throwError)

        return killer!
    }


    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     */
    public async on(fn: OneArgFn<T>) {
        for await (const data of this.future)
            fn(data)
    }

    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     * @returns a `Function` to cancel *this* specific listener at
     *      the end of the current thread. Activations have priority over canceller.
     */
    public onCancellable(fn: OneArgFn<T>) {
        type promiseGenerator = (current: number, racer?: Promise<never>) => AsyncIterableIterator<T>

        let killer!: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new CancelledEvent))

        async function runner(promiseGenerator: promiseGenerator, count: number) {
            for await (const data of promiseGenerator(count, rejector))
                fn(data)
        }
        
        runner(this.promiseGenerator.bind(this), this.count)

        return () => killer(new CancelledEvent)
    }

    /**
     * Calls a function every time an event is activated.
     * Continues even after a deactivation.
     * However it stops once Cancelled.
     */
    public async onContinueAfterError(fn: OneArgFn<T>, errFn?: OneArgFn<Error>) {
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

    /** Throws an error if it isn't cancellable. */
    private static throwError(err: Error) {
        if (!(err instanceof CancelledEvent))
            throw err
    }

    private makePromise() {
        this.promises.push(new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        }))
    }

    private async* promiseGenerator(
        current: number,
        racer?: Promise<never>
    ): AsyncIterableIterator<T> {
        try {
            if (racer)
                while (true) // earlier promise has priority
                    yield Promise.race([this.promises[current++], racer])
            else
                while (true)
                    yield this.promises[current++]
        } catch (err) { Emitter.throwError(err) }
    }

    private async* pastGenerator(start: number, end: number): AsyncIterableIterator<T> {
        try {
            for (let i = start; i < end; i++)
                yield this.promises[i++]
        } catch (err) { Emitter.throwError(err) }
    }
}
