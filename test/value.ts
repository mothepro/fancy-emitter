import { Emitter } from '../index'
import later from './later'

let actionNumber: Emitter<number>

describe('Emitter with values', () => {
    beforeEach(() => actionNumber = new Emitter)

    it('Classic, activated once with 12', done => {
        actionNumber.once(val => {
            if (val == 12)
                done()
        })
        actionNumber.activate(12)
    })

    it('Fancy, activated once with 12', async () => {
        later(() => actionNumber.activate(12))
        const val = await actionNumber.next
        val.should.eql(12)
    })

    it('Classic, activated three times increasing', done => {
        let lastVal = 0
        actionNumber.on(val => {
            if (val == lastVal + 1)
                lastVal = val
            if (lastVal == 3)
                done()
        })

        actionNumber.activate(1)
            .activate(2)
            .activate(3)
    })

    xit('Fancy, Promise should not resolve unless listened to first', async () => {
        later(() => actionNumber.activate(55))

        actionNumber.activate(-100)

        const num = await actionNumber.next
        num.should.eql(55)
    })
})