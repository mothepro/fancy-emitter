/** A function which takes an argument if it isn't undefined. */
type OneArgFn<T> = T extends void
    ? () => void
    : (arg: T) => void

export interface Listener<T = void> {
    readonly next: Promise<T>
    readonly all: AsyncIterableIterator<T>
    readonly count: number
    once(fn: OneArgFn<T>): void
    on(fn: OneArgFn<T>): void
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

    constructor() { this.makePromise() }

    private reject!: Function

    private resolve!: Function

    private readonly promises: Promise<T>[] = []

    /**
     * Resolves when event is activated.
     * Rejects when event is deactivated or cancelled.
     */
    get next() { return this.promises[this.count] }

    /** Iterator over ALL events which have occurred and will occur. */
    get all() { return this.promiseGenerator(0) }

    /** Iterator over the FUTURE events which will occur. */
    get future() { return this.promiseGenerator(this.count) }

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
        } catch (err) {
            if (!(err instanceof CancelledEvent))
                throw err
        }
    }

    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     */
    public async on(fn: OneArgFn<T>) {
        for await (const data of this.all)
            fn(data)
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

    private makePromise() {
        this.promises.push(new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        }))
    }

    private async* promiseGenerator(current: number): AsyncIterableIterator<T> {
        try {
            while (true)
                yield this.promises[current++]
        } catch (err) {
            if (!(err instanceof CancelledEvent))
                throw err
        }
    }
}
