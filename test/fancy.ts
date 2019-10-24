import 'should'
import { Emitter } from '../index'
import { later } from './util'

let action: Emitter

describe('Simple fancy usage', () => {
    beforeEach(() => action = new Emitter)

    it('Next promise should resolve', async () => {
        later(() => action.activate())
        await action.next
    })

    it('activated multiple times then cancel', async () => {
        let times = 0
        const cancel = action.onCancellable(() => times++)

        action.activate().activate()

        return new Promise(resolve => later(() => {
            cancel()
            action.activate()

            later(() => {
                times.should.eql(2)
                resolve()
            })
        }))
    })

    it('should cancel an event', async () => {
        later(() => action.activate())
        later(() => action.activate())
        later(() => action.cancel())
        later(() => action.activate())

        let times = 0
        for await (let _ of action)
            times++
        times.should.eql(2)
    })

    it('should activate many times, then deactivate', async () => {
        later(() => action.activate())
        later(() => action.activate())
        later(() => action.activate())
        later(() => action.deactivate(Error('nothing')))
        later(() => action.activate())

        let times = 0,
            gotError = false
        try {
            for await (let _ of action)
                times++
        } catch (e) {
            gotError = true
            e.message.should.eql('nothing')
        }

        times.should.eql(3)
        gotError.should.be.true()
    })
})
