import SafeEmitter from './SafeEmitter'
import Emitter from './Emitter'

export default function <T extends SafeEmitter<any>>(original: T) {
    const clone = original instanceof Emitter
        ? new Emitter<any>()
        : new SafeEmitter<any>()
    const promise = original.on((arg: any) => clone.activate(arg))
    if (clone instanceof Emitter)
        promise.catch(err => clone.deactivate(err))
    return clone as T
}
