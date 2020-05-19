import type { SafeListener } from '../types.js'
import { throwError } from '../Emitter.js'

/** Resolves once the `emitter` activates with `value`. Rejects if the emitter deactivates */
export async function filter<T>(emitter: SafeListener<T>, condition: (arg: T) => boolean) {
  try {
    for await (const current of emitter)
      if (condition(current))
        return
  } catch (err) {
    throwError(err)
  }
}

/** Resolves once the `emitter` activates with `value`. Rejects if the emitter deactivates */
export const filterValue = <T>(emitter: SafeListener<T>, value: T) => filter(emitter, current => current == value)
