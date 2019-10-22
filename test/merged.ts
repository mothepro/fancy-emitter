import { merge, SafeEmitter, Emitter } from '../index'
import later from './later'

it('Create a merged emitter', done => {
    const action = new SafeEmitter
    const actionNumber = new Emitter<number>()
    const merged = merge({ action, actionNumber })

    let actionTimes = 0,
        actionNumberTimes = 0

    merged.on(({ name, value }) => {
        if (value != undefined) {
            actionNumberTimes++
            name.should.eql('actionNumber')
            value.should.eql(12)
        } else {
            actionTimes++
            name.should.eql('action')
        }

        if (actionTimes == 2 && actionNumberTimes == 2)
            done()
    })

    later(() => action.activate())
    merged.activate({ name: 'action' })

    later(() => actionNumber.activate(12))
    merged.activate({ name: 'actionNumber', value: 12 })
})
