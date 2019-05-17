type ErrFn = (err: Error) => void

/** A function which takes an argument if it isn't undefined. */
type OneArgFn<T> =
    Extract<T, void> extends never
        ? (arg: T) => void      // T does NOT have void in it
        : Exclude<T, void> extends never
            ? () => void        // T is ONLY void
            : (arg?: T) => void // T is a combination of void and non void

/** Keys of an interface whose values are not `never`. */
type NonNeverKeys<T> = { [P in keyof T]: T[P] extends never ? never : P }[keyof T]

/** Keys of an interface whose values are `never`. */
type NeverKeys<T> = Exclude<keyof T, NonNeverKeys<T>>

/** Make the Keys with a `never` value optional. */
type OptionalNeverProps<T> = { [P in NonNeverKeys<T>]: T[P] } & { [P in NeverKeys<T>]?: T[P] }

/** The value an emitter returns. */
type Unpack<E> = E extends Emitter<infer T>
    ? Exclude<T, void> // NonNullable<T> should work
    : never

/** The return value for a merged emitter. */
type OneOfEmitters<T> = {
    [K in keyof T]: OptionalNeverProps<{
        name: K
        value: Unpack<T[K]>
    }>
}[keyof T]

export interface Listener<T = void> {
    readonly next: Promise<T>
    readonly previous: Promise<T>
    readonly all: AsyncIterableIterator<T>
    readonly future: AsyncIterableIterator<T>
    readonly past: Promise<T>[]
    readonly count: number

    once(fn: OneArgFn<T>): Promise<void>
    onceCancellable(fn: OneArgFn<T>, errFn?: ErrFn): Function
    on(fn: OneArgFn<T>): Promise<void>
    onCancellable(fn: OneArgFn<T>, errFn?: ErrFn): Function
    onContinueAfterError(fn: OneArgFn<T>, errFn?: ErrFn): void
}

export interface Broadcaster<T = void> {
    activate(...arg: Parameters<OneArgFn<T>>): this
    deactivate(err: Error): this
    cancel(): this
}

/**
 * A new light weight take on Node JS's EventEmitter class.
 * 
 * FancyEmitter is strongly typed and makes use of ES7 features such as:
 *  + Promises / asynchronous functions
 *  + Generators
 *  + for-of-await
 */
//TODO: Clear the promises member when they are no longer needed.
export default class Emitter<T = void> implements Listener<T>, Broadcaster<T> {

    /** Reject an event with this error to gracefully end next iteration. */
    protected static CancelledEvent = class extends Error {
        /** Swallows cancelled errors, rethrows all other errors. */
        static throwError(err: Error) {
            if (!(err instanceof Emitter.CancelledEvent))
                throw err
        }
    }

    /** Merge multiple emitters into one. */
    static merge<Emitters extends { [name: string]: Emitter<any> }>(map: Emitters) {
        const ret = new Emitter<OneOfEmitters<Emitters>>()

        for (const [name, emitter] of Object.entries(map))
            emitter.onContinueAfterError(
                // Casting is required since TS doesn't know if `EmitterValue` is void or not.
                // This screws up the OneArgFn type.
                (value: any) => (ret.activate as any)({ name, value }),
                err => {
                    (err as Error & { emitter: typeof name }).emitter = name
                    ret.deactivate(err)
                }
            )
        
        return ret
    }

    constructor() { this.makePromise() }

    private reject!: Function

    private resolve!: Function

    protected readonly promises: Promise<T>[] = []

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
    get past() { return this.promises.slice(0, this.count) }

    /** The number of times this event has been activated or deactivated. */
    get count() { return this.promises.length - 1 }

    /** Triggers an event. */
    activate(...arg: Parameters<OneArgFn<T>>): this
    activate(arg?: T) {
        this.resolve(arg)
        this.makePromise()
        return this
    }

    /** Throw an error for the next event. */
    deactivate(err: Error) {
        this.reject(err)
        this.makePromise()
        return this
    }

    /** Cancels the next event. */
    // TODO: Cancel should not create any more promises?
    cancel(message?: string) {
        return this.deactivate(new Emitter.CancelledEvent(message))
    }

    /**
     * Calls a function the next time is activated.
     * 
     * Note: To catch deactivations, add a following `.catch` call after this method.
     */
    async once(fn: OneArgFn<T>) {
        try {
            fn(await this.next)
        } catch (err) {
            Emitter.CancelledEvent.throwError(err)
        }
    }

    /**
     * Calls a function every time an event is activated.
     * Stops after a cancellation.
     * 
     * Note: To catch deactivations, add a following `.catch` call after this method.
     */
    async on(fn: OneArgFn<T>) {
        for await (const data of this.future)
            fn(data)
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
    onceCancellable(fn: OneArgFn<T>, errFn: ErrFn = () => {}) {
        let killer: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new Emitter.CancelledEvent))

        Promise.race([this.next, rejector])
            .then(fn)
            .catch(Emitter.CancelledEvent.throwError)
            .catch(errFn)

        return killer!
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
     *  the end of the current thread. Note: Activations have priority over this canceller.
     */
    onCancellable(fn: OneArgFn<T>, errFn?: ErrFn) {
        type promiseGenerator = (current: number, racer?: Promise<never>) => AsyncIterableIterator<T>

        let killer!: Function
        const rejector: Promise<never> = new Promise(
            (_, reject) => killer = () => reject(new Emitter.CancelledEvent))

        async function runner(promiseGenerator: promiseGenerator, count: number) {
            try {
                for await (const data of promiseGenerator(count, rejector))
                    fn(data)
            } catch (e) {
                if (errFn)
                    errFn(e)
            }
        }

        runner(this.promiseGenerator.bind(this), this.count)

        return () => killer(new Emitter.CancelledEvent)
    }

    /**
     * Calls a function every time an event is activated.
     * Continues even after a deactivation.
     * However it stops once Cancelled.
     */
    async onContinueAfterError(fn: OneArgFn<T>, errFn?: ErrFn) {
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

    protected async* promiseGenerator(
        current = this.count,
        racer?: Promise<never>,
    ): AsyncIterableIterator<T> {
        try {
            while (true)
                yield racer
                    ? Promise.race([
                        this.promises[current++], // this has priority over racer 
                        racer])
                    : this.promises[current++]
        } catch (err) {
            Emitter.CancelledEvent.throwError(err)
        }
    }
}
