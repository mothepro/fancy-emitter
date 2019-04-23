import 'should'
import Emitter from './index' // vs. '.'. This prevents TS5055 for `dist/index.d.ts`

/*
 * `setTimeout` is used to run a function after the listeners are put in place.
 * In practice this would never need to be done since the thread activating the
 * event is not the same as the one listening.
 */

describe('Empty Emitter', () => {

    let action: Emitter
    beforeEach(() => action = new Emitter)

    describe('Classical Listeners', () => {

        it('should be activated once', done => {
            action.once(done)
            action.activate()
        })

        it('should be activated once and cancellable', done => {
            action.onceCancellable(done)
            action.activate()
        })

        it('should not be activated with onceCancellable', done => {
            const cancel = action.onceCancellable(() => done(Error('never be called')))
            action.once(done)

            cancel()
            action.activate()
        })

        it('should not be activated with onceCancellable and throw', async () => {
            setTimeout(() => action.deactivate(Error('Deactivation')))

            try {
                action.onceCancellable(() => Error('never be called'))
                await action.next
                throw 'Should not be reached'
            } catch(e) {
                e.message.should.eql('Deactivation')
            }
        })

        it('should be activated three times', done => {
            let times = 0
            action.on(() => {
                if (++times == 3)
                    done()
            })

            action.activate().activate().activate()
            action.count.should.eql(3)
        })

        it('should be activated more times', done => {
            let times = 0
            action.on(() => times++)
            action.on(() => {
                if(++times == 6)
                    done()
            })

            action.activate().activate().activate()
        })

        it('should activate both once\'s', done => {
            let times = 0
            const hit = () => {
                if(++times >= 2)
                    done()
            }
            action.once(hit)
            action.once(hit)

            action.activate()
            action.count.should.eql(1)
        })
    })

    describe('Classical Error Handling', () => {
        it('should cancel an event', done => {
            let times = 0
            action.on(() => {
                if(++times >= 2)
                    done()
            })

            action.activate()
                .activate()
                .cancel()
                .activate()
        })

        it('should continue activate even after an error', done => {
            let times = 0
            action.onContinueAfterError(
                () => {
                    if (times++ == 100)
                        done()
                },
                (err) => {
                    err.should.be.an.instanceOf(Error)
                    if(times == 3)
                        times = 100
                })

            action.activate()
                .activate()
                .activate()
                .deactivate(Error('nothing'))
                .activate()
        })

        it('should continue activate even after a cancellation', done => {
            action.onContinueAfterError(done, err => done(err))

            action.activate()
                .cancel('nothing')
                .activate()
        })
    })

    describe('Fancy Listeners', () => {

        it('promise should resolve', async () => {
            setTimeout(() => action.activate())
            await action.next
        })

        it('all promises should resolve', async () => {
            let times = 0
            action.activate().activate()
            setTimeout(() => action.activate().activate())

            for await (let _ of action.all)
                if (++times == 4)
                    break
        })

        it('promises from past should resolve', async () => {
            let times = 0
            action.activate().activate()

            for await (let _ of action.past)
                times++
            action.count.should.eql(2)
            times.should.eql(2)
        })

        it('should be activated three times', async () => {
            setTimeout(() => action.activate().activate().activate())

            let times = 0
            for await (let _ of action.future)
                if (++times == 3)
                    break
        })
        
        it('should be activated multiple times then cancel', done => {
            let times = 0
            const cancel = action.onCancellable(() => times++)

            action.activate().activate()
            setTimeout(() => {
                cancel()
                action.activate()
                
                setTimeout(() => {
                    times.should.eql(2)
                    done()
                })
            })
        })
    })

    describe('Fancy Error Handling', () => {

        it('should cancel an event', async () => {
            setTimeout(() =>
                action.activate()
                    .activate()
                    .cancel()
                    .activate())

            let times = 0
            for await (let _ of action.future)
                times++
            times.should.eql(2)
        })

        it('should activate many times, then deactivate', async () => {
            setTimeout(() =>
                action.activate()
                    .activate()
                    .activate()
                    .deactivate(Error('nothing'))
                    .activate())

            let times = 0,
                gotError = false
            try {
                for await (let _ of action.future)
                    times++
            } catch (e) {
                gotError = true
                e.message.should.eql('nothing')
            }

            times.should.eql(3)
            gotError.should.be.true()
        })
    })
})

describe('Emitter with a value', () => {

    let action: Emitter<number>
    beforeEach(() => action = new Emitter)

    it('Classic, should be activated once with 12', done => {
        action.once(val => {
            if(val == 12)
                done()
        })
        action.activate(12)
    })

    it('Fancy, should be activated once with 12', async () => {
        setTimeout(() => action.activate(12))
        const val = await action.next
        val.should.eql(12)
    })

    it('Classic, should be activated three times increasing', done => {
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

    it('Fancy, Promise should not resolve unless listened to first', async () => {
        const a = new Emitter<string>()
        setTimeout(() => a.activate('after'))

        a.activate('before')
        a.count.should.eql(1)

        const str = await a.next
        str.should.eql('after')
    })
})
