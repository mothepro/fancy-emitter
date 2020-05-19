import type { SafeListener } from '../types.js'
import { throwError } from '../Emitter.js'

/**
 * Resolves with `true` once the `emitter` activates with `value`.
 * Rejects if the emitter deactivates
 * Resolves with `false` if cancelled.
 * 
 * Usually the boolean returned can be ignored...
 */
export async function filter<T>(emitter: SafeListener<T>, condition: (arg: T) => boolean) {
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
