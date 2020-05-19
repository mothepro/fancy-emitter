import { spy } from 'sinon'
import { Emitter } from '../index.js'
import later from './later.js'

let action: Emitter

describe('Simple fancy usage', () => {
  beforeEach(() => action = new Emitter)

  it('Next promise should resolve', async () => {
    action.activate()
    await action.next
  })

  it('activated multiple times then cancel', async () => {
    const listener = spy()
    const cancel = action.onCancellable(listener)

    action.activate().activate()
    action.isAlive.should.be.true()

    return new Promise(resolve => later(() => {
      cancel()
      action.activate()

      later(() => {
        listener.should.have.been.calledTwice()
        resolve()
      })
    }))
  })

  it('should cancel an event', async () => {
    const listener = spy()
    action.activate()
    later(action.activate)
    later(action.cancel)
    later(action.activate)

    for await (let _ of action)
      listener()

    listener.should.have.been.calledTwice()
    action.isAlive.should.be.false()
  })

  it('should activate many times, then deactivate', async () => {
    const listener = spy()
    later(action.activate)
    later(action.activate)
    later(action.activate)
    later(() => action.deactivate(Error('nothing')))
    later(action.activate)

    let gotError = false
    try {
      for await (let _ of action)
        listener()
    } catch (e) {
      gotError = true
      e.message.should.eql('nothing')
    }

    listener.should.have.been.calledThrice()
    gotError.should.be.true()
    action.isAlive.should.be.false()
  })

  it('should have a consistent calling order', done => {
    const callOrder: number[] = []

    action.once(() => callOrder.push(1))
    action.on(() => callOrder.push(2))
    action.once(() => callOrder.push(3))

    action.activate()

    later(() => {
      action.count.should.eql(1)
      callOrder.should.eql([1, 2, 3])
      done()
    })
  })
})
