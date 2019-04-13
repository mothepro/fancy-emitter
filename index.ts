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
    every(fn: OneArgFn<T>, errFn: OneArgFn<Error>): void
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

    private promises: Promise<T>[] = []

    /**
     * Resolves when event is activated.
     * Rejects when event is deactivated or cancelled.
     */
    get next() { return this.promises[this.count] }

    /** Async generator which listens to all events. */
    get all() { return this.promiseGenerator() }

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
    public cancel() {
        return this.deactivate(new CancelledEvent)
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
     * Calls a function every time an event is activated
     * Continues even after a cancellation.
     */
    public async every(fn: OneArgFn<T>, errFn?: OneArgFn<Error>) {
        try {
            for await (const data of this.all)
                fn(data)
        } catch (e) {
            if (errFn)
                errFn(e)
            // TODO: Continue where left off
            this.every(fn, errFn)
        }
    }

    private makePromise() {
        this.promises.push(new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        }))
    }

    private async* promiseGenerator(current = this.count): AsyncIterableIterator<T> {
        try {
            while (true)
                yield this.promises[current++]
        } catch (err) {
            if (!(err instanceof CancelledEvent))
                throw err
        }
    }
}
