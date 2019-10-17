
import { OneArgFn } from './types'

/**
 * A new, light weight take on Node JS's EventEmitter class.
 * 
 * FancyEmitter is strongly typed and makes use of ES7 features such as:
 *  + Promises / asynchronous functions
 *  + Generators
 *  + for-of-await
 */
export default class d<T = void> implements AsyncIterable<T> {

    constructor() { this.makePromise() }

    protected reject!: Function

    private resolve!: Function

    protected readonly queue: Promise<T>[] = []

    /**
     * Dequeues a promise and yields it so it may be awaited on.
     * A pending promise is enqueued everytime one is resolved.
     */
    async* [Symbol.asyncIterator]() {
        while (this.queue.length)
            yield this.queue.shift()!
    }

    /** Resolves when event is activated. */
    get next() { return this.queue[0] }

    /** Triggers an event. */
    activate(...arg: Parameters<OneArgFn<T>>): this
    activate(arg?: T) {
        this.resolve(arg)
        this.makePromise()
        return this
    }

    /** Calls `fn` the next time this is activated. */
    async once(fn: OneArgFn<T>) {
        fn(await this.next)
    }

    /** Calls `fn` every time this is activated. */
    async on(fn: OneArgFn<T>) {
        for await (const data of this)
            fn(data)
    }

    /** Add a new promise to the queue and save its resolve and rejector */
    private makePromise() {
        this.queue.push(new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        }))
    }
}

declare global {
    interface Window {
        pootis: typeof d
    }
}
window.pootis = d