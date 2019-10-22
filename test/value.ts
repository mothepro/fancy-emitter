import { Emitter } from '../index'
import later from './later'

let action: Emitter<number>

describe('Emitter with values', () => {
    beforeEach(() => action = new Emitter)

    it('activated once with 12', done => {
        action.once(val => {
            if (val == 12)
                done()
        })
        action.activate(12)
    })

    it('activated once again with 12', async () => {
        later(() => action.activate(12))
        const val = await action.next
        val.should.eql(12)
    })

    it('activated three times increasing', done => {
        let lastVal = 0
        action.on(val => {
            if (val == lastVal + 1)
                lastVal = val
            if (lastVal == 3)
                done()
        })

        action.activate(1)
            .activate(2)
            .activate(3)
    })
})