import { spy } from 'sinon'
import { Emitter } from '../index.js'
import { later } from './util.js'

let action: Emitter<number>

describe('Emitter with values', () => {
  beforeEach(() => action = new Emitter)

  it('activated once with 12', done => {
    const listener = spy()
    action.once(listener)
    action.activate(12)

    later(() => {
      action.count.should.eql(1)
      listener.should.have.been.calledOnce()
      listener.should.have.been.calledWith(12)
      done()
    })
  })

  it('activated once again with 12', async () => {
    later(() => action.activate(12))
    const val = await action.next
    val.should.eql(12)
  })

  it('activated three times increasing', done => {
    const listener = spy()
    action.on(listener)

    action.activate(1)
          .activate(2)
          .activate(3)
    
    later(() => {
      action.count.should.eql(3)
      listener.should.have.been.calledThrice()
      listener.should.have.been.calledWith(1)
      listener.should.have.been.calledWith(2)
      listener.should.have.been.calledWith(3)
      done()
    })
  })
})
