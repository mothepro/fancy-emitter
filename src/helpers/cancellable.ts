import type { OneArgFn, ErrFn, Listener } from '../../index'
import { CancelledEvent, throwError } from '../Emitter.js'
import clone from './clone.js'
import { Emitter } from '../../index.js'

/**
 * Calls `fn` the next time `emitter` is activated.
 * 
 * @param fn The function to be called once emitter is activated.
 * @param errFn A function to be called if emitter is deactivated instead of
 *  cancelled. By default `Error`'s are swallowed, otherwise the async function
 *  called within would cause an `UnhandledPromiseRejection`.
 * @returns a `Function` to cancel *emitter* specific listener.
 */
export function onceCancellable<T>(emitter: Listener<T>, fn: OneArgFn < T >, errFn: ErrFn = () => { }) {
  let killer: Function
  const rejector: Promise<never> = new Promise(
    (_, reject) => killer = () => reject(new CancelledEvent))

  Promise.race([emitter.next, rejector])
    .then(fn)
    .catch(throwError)
    .catch(errFn)

  return killer!
}

/**
 * Calls `fn` every time `emitter` is activated.
 * Stops after a cancellation or deactivation.
 * 
 * @param fn The function to be called once the emitter is activated.
 * @param errFn A function to be called if the emitter is deactivated instead of
 *  cancelled. By default `Error`'s are swallowed, otherwise the async function
 *  called within would cause an `UnhandledPromiseRejection`.
 * @returns a `Function` to cancel *emitter* specific listener at
 *  the end of the current thread. Note: Activations have priority over emitter canceller.
 */
// TODO: Optimize this by having listening on the async iterable instead of cloning.
export function onCancellable<T>(emitter: Emitter<T>, fn: OneArgFn<T>, errFn: ErrFn = () => { }) {
  const cloned = clone(emitter)
  cloned.on(fn).catch(errFn)
  return cloned.cancel
}
