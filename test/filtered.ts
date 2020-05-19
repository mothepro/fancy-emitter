import { filterValue, filter, SafeEmitter, Emitter } from '../index.js'

describe('Filtered', () => {
  it('Safe Emitter', () => {
    const action = new SafeEmitter<number>()
    const positive = filterValue(action, 100)
    const negative = filterValue(action, -10)

    action.activate(0)
    action.activate(10)
    action.activate(100)

    negative.should.not.be.resolved()
    positive.should.be.resolvedWith(true)
  })

  it('Conditional', () => {
    const action = new Emitter<number>()
    const promise = filter(action, num => num == action.count)

    action.activate(0)

    promise.should.be.resolved()
  })

  it('Deactivation', () => {
    const action = new Emitter<number>()
    const rejected = filterValue(action, 1)

    action.deactivate(Error('deactivation'))

    rejected.should.be.rejectedWith('deactivation')
  })

  it('Cancelled', () => {
    const action = new Emitter<number>()
    const cancelled = filterValue(action, 1)

    action.cancel()

    cancelled.should.be.resolvedWith(false)
  })
})
