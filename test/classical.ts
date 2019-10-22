import 'should'
import { SafeEmitter } from '../index'

let action: SafeEmitter

describe('Simple classical usage', () => {
    beforeEach(() => action = new SafeEmitter)

    it('activated once', done => {
        action.once(done)
        action.activate()
    })

    it('activated three times', done => {
        let times = 0
        action.on(() => {
            if (++times == 3)
                done()
        })

        action.activate().activate().activate()
    })

    it('activated more times', done => {
        let times = 0
        action.on(() => times++)
        action.on(() => {
            if (++times == 6)
                done()
        })

        action.activate().activate().activate()
    })

    it('should activate both once\'s', done => {
        let times = 0
        const hit = () => {
            if (++times >= 2)
                done()
        }
        action.once(hit)
        action.once(hit)

        action.activate()
    })
})
