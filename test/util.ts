/**
 * Calls a function after the current thread is complete.
 * 
 * `setTimeout` is used to run a function after the listeners are put in place.
 * In practice this would never need to be done since the thread activating the
 * event is not the same as the one listening.
 */
export function later(fn: Function) {
    setTimeout(fn)
}

/**
 * Calls a function after all `later` calls.
 * This can be used to assert after all activations have been fufilled.
 */
export function alotLater(fn: Function) {
  setTimeout(fn, 10)
}
