import { spy } from 'sinon'
import { merge, SafeEmitter, Emitter } from '../index'
import { later, alotLater } from './util'

it('Create a merged emitter', done => {
  const listener = spy()
  const action = new SafeEmitter
  const actionNumber = new Emitter<number>()
  const merged = merge({ action, actionNumber })

  merged.on(listener)

  later(action.activate)
  merged.activate({ name: 'action' })

  later(() => actionNumber.activate(12))
  merged.activate({ name: 'actionNumber', value: 12 })

  alotLater(() => {
    listener.should.have.callCount(4)
    listener.should.have.been.calledWith({ name: 'action' })
    listener.should.have.been.calledWith({ name: 'action' })
    listener.should.have.been.calledWith({ name: 'actionNumber', value:12 })
    listener.should.have.been.calledWith({ name: 'actionNumber', value: 12 })
    done()
  })
})
