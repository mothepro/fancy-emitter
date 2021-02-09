import type { SafeListener } from '../../index'
import { throwError } from '../Emitter.js'

/**
 * Resolves with `true` once the `emitter` activates with a `value` that makes the `condition` return true.
 * Rejects if the emitter deactivates
 * Resolves with `false` if cancelled.
 * 
 * By default, the `condition` always returns false, meaning this function can be used to await the end of an emitter.
 */
export async function filter<T>(emitter: SafeListener<T>, condition: (arg: T) => boolean = () => false) {
  try {
    for await (const current of emitter)
      if (condition(current))
        return true
  } catch (err) {
    throwError(err)
  }
  return false
}

/** Resolves once the `emitter` activates with `value`. Rejects if the emitter deactivates */
export const filterValue = <T>(emitter: SafeListener<T>, value: T) => filter(emitter, current => current == value)
