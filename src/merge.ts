import Emitter from './Emitter.js'
import SafeEmitter from './SafeEmitter.js'

/** The value an emitter is bound with. */
type Unpack<E> = E extends SafeEmitter<infer T> ? T : void

/** The return value for a merged emitter. */
type OneOfEmitters<T> = {
    [K in keyof T]: Omit<{
      name: K
      value: Unpack<T[K]>
    }, Unpack<T[K]> extends void ? 'value' : never>
}[keyof T]

/** 
 * Merge multiple emitters into one.
 * 
 * Always returns an Emitter even if only `SafeEmitter`s were given.
 * In the case a given emitter is deactivated the returned emitter will
 *  deactivate as well with the `emitter` field containing the name of
 *  the offending emitter. 
 * Cancellations of a given emitter do not stop the returned emitter.
 */
export default function<Emitters extends { [name: string]: SafeEmitter<any> }>(map: Emitters) {
    const ret = new Emitter<OneOfEmitters<Emitters>>()
    for (const [name, emitter] of Object.entries(map))
        // Casting is required since TS doesn't know if `EmitterValue` is void or not.
        // This screws up the OneArgFn type.
        emitter
            .on((value: any) => (ret.activate as any)({ name, value }))
            .catch((err: Error & { emitter: typeof name }) => {
                err.emitter = name
                ret.deactivate(err)
            })
    return ret
}
