import SafeEmitter from './SafeEmitter'
import Emitter from './Emitter'
import { Unpack } from './merge'

// TODO allow creation of SafeEmitters as well
export default function <T extends SafeEmitter<any>>(original: T): Emitter<Unpack<T>> {
    const clone = new Emitter<any>()
    original
        .on((arg: any) => clone.activate(arg))
        .catch(err => clone.deactivate(err))
    return clone
}
