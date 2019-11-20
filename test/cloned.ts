import { clone, SafeEmitter } from '../index.js'

it('Create a cloned emitter', done => {
    const original = new SafeEmitter
    const cloned = clone(original)

    cloned.once(done)
    original.activate()
})
