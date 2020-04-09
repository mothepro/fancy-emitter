import { OneArgFn, SafeListener, SafeBroadcaster } from './types'

/**
 * A new, light weight take on Node JS's EventEmitter class.
 * 
 * FancyEmitter is strongly typed and makes use of ES7 features such as:
 *  + Promises / asynchronous functions
 *  + Generators
 *  + for-of-await
 */
export default class <T = void> implements AsyncIterable<T>, SafeListener<T>, SafeBroadcaster<T> {

  protected resolve?: Function

  protected readonly queue: Promise<T>[] = [
    new Promise(resolve => this.resolve = resolve)
  ]

  constructor(
    /**
     * Listeners to attach immediately.
     * Errors thrown will be ignored, as to not throw Unhandled promise exceptions.
     */
    ...listeners: OneArgFn<T>[]
  ) {
    /*
     * Removes the promise from the queue as soon as it has been resolved.
     *
     * Anyone who listened to the promise before this point already has a
     * reference to the promise. When all listeners have handled the result
     * The promise can be safely GC'd.
     */
    listeners.unshift((() => this.queue.shift()) as OneArgFn<T>) // unsure why ths needs casting...

    for (const listener of listeners)
      this.on(listener).catch(() => { })
  }

  /** Triggers an event. */
  readonly activate = ((arg?: T) => {
    if (this.resolve) {
      this.resolve(arg)
      this.queue.push(new Promise(resolve => this.resolve = resolve))
    }
    return this
  }) as OneArgFn<T, this>

  /** 
   * Resolves next time this is activated.
   * Throws a TypeError if this is no longer making events.
   */
  // Chain a then to add a second microtick so that once & on match registration order
  // @see https://stackoverflow.com/questions/59263926/async-resolution-order-for-await-single-promise-vs-async-iterators/
  get next() { return this.queue[0].then(a => a) }

  get [Symbol.toStringTag]() { return 'SafeEmitter' }

  /**
   * Dequeues a promise and yields it so it may be awaited on.
   * A pending promise is enqueued everytime one is resolved.
   */
  // Uses the queue directly since iteration takes a microtick.
  async*[Symbol.asyncIterator]() {
    while (this.queue.length)
      yield this.queue[0]
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
}
