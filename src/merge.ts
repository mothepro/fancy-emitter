import Emitter from './Emitter.js'
import SafeEmitter from './SafeEmitter.js'

/** Keys of an interface whose values are not `never`. */
type NonNeverKeys<T> = { [P in keyof T]: T[P] extends never ? never : P }[keyof T]

/** Keys of an interface whose values are `never`. */
type NeverKeys<T> = Exclude<keyof T, NonNeverKeys<T>>

/** Make the Keys with a `never` value optional. */
// TODO: Use the new Omit utility type?
type OptionalNeverProps<T> = { [P in NonNeverKeys<T>]: T[P] } & { [P in NeverKeys<T>]?: T[P] }

/** The value an emitter returns. */
type Unpack<E> = E extends SafeEmitter<infer T>
    ? Exclude<T, void> // NonNullable<T> should work
    : never

/** The return value for a merged emitter. */
type OneOfEmitters<T> = {
    [K in keyof T]: OptionalNeverProps<{
        name: K
        value: Unpack<T[K]>
    }>
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
export default function<E extends SafeEmitter<any>, Emitters extends { [name: string]: E }>(map: Emitters): E {
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
    return ret as any
}
