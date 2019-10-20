import 'should'
import { SafeEmitter, Emitter } from '../index'
import later from './later'

let action: SafeEmitter
let actionUnsafe: Emitter
let actionNumber: Emitter<number>

describe('Simple Safe Emitter', () => {
    beforeEach(() => {
        action = new SafeEmitter
        actionUnsafe = new Emitter
        actionNumber = new Emitter
    })

    it('activated once', done => {
        action.once(done)
        action.activate()
    })

    it('activated three times', done => {
        let times = 0
        action.on(() => {
            if (++times == 3)
                done()
        })

        action.activate().activate().activate()
    })

    it('activated more times', done => {
        let times = 0
        action.on(() => times++)
        action.on(() => {
            if (++times == 6)
                done()
        })

        action.activate().activate().activate()
    })

    it('should activate both once\'s', done => {
        let times = 0
        const hit = () => {
            if (++times >= 2)
                done()
        }
        action.once(hit)
        action.once(hit)

        action.activate()
    })
})

describe('Simple Unsafe Emitter', () => {
    it('deactivated, never activated', done => {
        actionUnsafe
            .once(() => { throw 'should not be reached' })
            .catch((e: Error) => {
                e.message.should.eql('Deactivation')
                done()
            })

        actionUnsafe.deactivate(Error('Deactivation'))
    })

    it('cancelled, never activated nor deactivated', done => {
        actionUnsafe
            .once(() => done(Error('`fn` should never be called')))
            .catch(() => done(Error('`errFn` should never be called')))

        actionUnsafe.cancel()
        done()
    })
    
    it('activated once and not cancelled', done => {
        actionUnsafe.onceCancellable(done)
        actionUnsafe.activate()
    })

    it('entirely cancelled before activation', done => {
        actionUnsafe.onceCancellable(
            () => done(Error('`fn` should never be called')),
            () => done(Error('`errFn` should never be called')))

        actionUnsafe.cancel()
        actionUnsafe.activate()
        done()
    })

    it('cancelled before activation', done => {
        const cancel = actionUnsafe.onceCancellable(
            () => done(Error('`fn` should never be called')),
            () => done(Error('`errFn` should never be called')))
        actionUnsafe.once(done)

        cancel()
        actionUnsafe.activate()
    })

    it('deactivated before activation', done => {
        actionUnsafe.onceCancellable(
            () => done(Error('never be called')),
            err => {
                err.message.should.eql('Deactivation')
                done()
            })

        actionUnsafe.deactivate(Error('Deactivation'))
    })

    it('deactivation throws, never activates onceCancellable', async () => {
        later(() => actionUnsafe.deactivate(Error('Deactivation')))

        try {
            actionUnsafe.onceCancellable(() => Error('never be called'))
            await actionUnsafe.next
            throw 'Should not be reached'
        } catch (e) {
            e.message.should.eql('Deactivation')
        }
    })
})
