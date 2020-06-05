import type { OneArgFn, SafeSingleBroadcaster, SafeSingleListener } from './types'

/** An Emitter for just a single event. */
export default class <T = void> extends Promise<T> implements SafeSingleBroadcaster<T>, SafeSingleListener<T> {
  get [Symbol.toStringTag]() { return 'SafeSingleEmitter' }

  /** Whether this has been activated already. */
  readonly triggered: boolean

  /** Resolves this promise. */
  readonly activate: OneArgFn<T, this>

  // @ts-ignore This actually is allowed
  constructor() {
    let resolve: Function
    if (typeof arguments[0] == 'function') // Required Native Promise handling
      super(arguments[0])
    else
      super(ok => resolve = ok)

    this.triggered = false
    this.activate = ((arg: T) => {
      (this.triggered as boolean) = true
      resolve(arg)
      return this
    }) as OneArgFn<T, this>
  }
}
