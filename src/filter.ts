import type { SafeListener } from './types.js'
import { throwError } from './Emitter.js'

/** Resolves once the `emitter` activates with `value`. Rejects if the emitter deactivates */
export default async function <T>(emitter: SafeListener<T>, value: T) {
  try {
    for await (const current of emitter)
      if (value == current)
        return
  } catch (err) {
    throwError(err)
  }
}
