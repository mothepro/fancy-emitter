import { filterValue, SafeEmitter } from '../index.js'

it('Filter an emitter', async () => {
  const action = new SafeEmitter<number>()
  const positive = filterValue(action, 100)
  const negative = filterValue(action, -10)

  action.activate(0)
  action.activate(10)
  action.activate(100)

  negative.should.not.be.resolved()
  positive.should.be.resolved()
})
