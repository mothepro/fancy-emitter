import { merge, SafeEmitter, Emitter } from '../index'
import { later } from './util'

it('Create a merged emitter', done => {
    const action = new SafeEmitter
    const actionNumber = new Emitter<number>()
    const merged = merge({ action, actionNumber })

    let actionTimes = 0,
        actionNumberTimes = 0

    merged.on((event) => {
        switch (event.name) {
            case 'action':
                actionTimes++
                break
            
            case 'actionNumber':
                actionNumberTimes++
                event.value.should.eql(12)
                break

            default:
                throw Error(`merged event ${JSON.stringify(event)} must have a name of "action" or "actionNumber".`)
        }

        if (actionTimes == 2 && actionNumberTimes == 2)
            done()
    })

    later(() => action.activate())
    merged.activate({ name: 'action' })

    later(() => actionNumber.activate(12))
    merged.activate({ name: 'actionNumber', value: 12 })
})
