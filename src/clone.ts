import SafeEmitter from './SafeEmitter'
import Emitter from './Emitter'

export default function <T extends SafeEmitter<any>>(original: T) {
    const clone = original instanceof Emitter
        ? new Emitter<any>()
        : new SafeEmitter<any>()
    const promise = original.on(clone.activate)
    if (clone instanceof Emitter)
        promise.catch(clone.deactivate)
    return clone as T
}
