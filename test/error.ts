import { spy } from 'sinon'
import { Emitter } from '../index'
import { later, alotLater } from './util'

let action: Emitter

describe('Classical Error Handling', () => {
    beforeEach(() => action = new Emitter)

    it('deactivated, never activated', done => {
        action
            .once(() => { throw 'should not be reached' })
            .catch((e: Error) => {
                e.message.should.eql('Deactivation')
                done()
            })

        action.deactivate(Error('Deactivation'))
    })

    it('cancelled, never activated nor deactivated', done => {
        action
            .once(() => done(Error('`fn` should never be called')))
            .catch((e) => done(Error('`errFn` should never be called [[[' + e)))

        action.cancel()
        done()
    })

    it('activated once and not cancelled', done => {
        action.onceCancellable(done)
        action.activate()
    })

    it('entirely cancelled before activation', done => {
        action.onceCancellable(
            () => done(Error('`fn` should never be called')),
            () => done(Error('`errFn` should never be called')))

        action.cancel()
        action.activate()
        done()
    })

    it('cancelled before activation', done => {
        const cancel = action.onceCancellable(
            () => done(Error('`fn` should never be called')),
            () => done(Error('`errFn` should never be called')))
        action.once(done)

        cancel()
        action.activate()
    })

    it('deactivated before activation', done => {
        action.onceCancellable(
            () => done(Error('never be called')),
            err => {
                err.message.should.eql('Deactivation')
                done()
            })

        action.deactivate(Error('Deactivation'))
    })

    it('deactivation throws, never activates onceCancellable', async () => {
        later(() => action.deactivate(Error('Deactivation')))

        try {
            action.onceCancellable(() => Error('never be called'))
            await action.next
            throw 'Should not be reached'
        } catch (e) {
            e.message.should.eql('Deactivation')
        }
    })

  it('cancel an event', done => {
    const listener = spy()
    action.on(listener)

    action.activate()
      .activate()
      .cancel()
      .activate()
    
    alotLater(() => {
      listener.should.have.been.calledTwice()
      done()
    })
  })
})
