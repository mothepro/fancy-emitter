import SafeEmitter from './SafeEmitter'
import Emitter from './Emitter'

export default function <T extends SafeEmitter<any> | Emitter<any>>(original: T) {
    const clone = original instanceof SafeEmitter
        ? new SafeEmitter<any>()
        : new Emitter<any>()
    const promise = original.on(clone.activate)
    if (clone instanceof Emitter)
        promise.catch(clone.deactivate)
    return clone as T
}
