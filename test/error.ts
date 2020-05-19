import { spy } from 'sinon'
import { Emitter } from '../index.js'
import later from './later.js'
import { onceCancellable } from '../src/helpers/cancellable.js'

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
      .catch((e) => done(Error('`errFn` should never be called')))

    action.cancel()
    done()
  })

  it('activated once and not cancelled', done => {
    onceCancellable(action, done)
    action.activate()
  })

  it('entirely cancelled before activation', done => {
    onceCancellable(action,
      () => done(Error('`fn` should never be called')),
      () => done(Error('`errFn` should never be called')))

    action.cancel()
    action.activate()
    done()
  })

  it('cancelled before activation', done => {
    const cancel = onceCancellable(action,
      () => done(Error('`fn` should never be called')),
      () => done(Error('`errFn` should never be called')))
    action.once(done)

    cancel()
    action.activate()
  })

  it('deactivated before activation', done => {
    onceCancellable(action,
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
      onceCancellable(action, () => Error('never be called'))
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

    later(() => {
      listener.should.have.been.calledTwice()
      done()
    })
  })
})
