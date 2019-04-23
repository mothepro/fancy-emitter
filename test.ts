import 'should'
import Emitter from './index' // vs. '.'. This prevents TS5055 for `dist/index.d.ts`

let action: Emitter
let actionNumber: Emitter<number>

/**
 * Calls a function after the current thread is complete.
 * 
 * `setTimeout` is used to run a function after the listeners are put in place.
 * In practice this would never need to be done since the thread activating the
 * event is not the same as the one listening.
 */
function later(fn: Function) { setTimeout(fn) }

/** Activates the action after the current thread is complete. */
function activateLater(val?: number) {
    val == undefined
        ? later(() => action.activate())
        : later(() => actionNumber.activate(val))
}

/** Cancels the action after the current thread is complete. */
function cancelLater() {
    later(() => action.cancel())
}

/** Deactivates the action after the current thread is complete. */
function deactivateLater(message?: string) {
    later(() => action.deactivate(Error(message)))
}

beforeEach(() => {
    action = new Emitter
    actionNumber = new Emitter
})

describe('Classical Listeners', () => {

    it('should be activated once', done => {
        action.once(done)
        action.activate()
    })

    it('should be deactivated, never activated', done => {
        action
            .once(() => { throw 'should not be reached' })
            .catch(e => {
                e.message.should.eql('Deactivation')
                done()
            })

        action.deactivate(Error('Deactivation'))
    })
    
    it('should be cancelled, never activated', done => {
        action
            .once(() => done(Error('`fn` should never be called')))
            .catch(() => done(Error('`errFn` should never be called')))

        action.cancel()
        done()
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

    describe('Cancellable Emitters', () => {

        it('should be activated once and not cancelled', done => {
            action.onceCancellable(done)
            action.activate()
        })

        it('should be entirely cancelled before activation', done => {
            action.onceCancellable(
                () => done(Error('`fn` should never be called')),
                () => done(Error('`errFn` should never be called')))

            action.cancel()
            action.activate()
            done()
        })

        it('should be cancelled before activation', done => {
            const cancel = action.onceCancellable(
                () => done(Error('`fn` should never be called')),
                () => done(Error('`errFn` should never be called')))
            action.once(done)

            cancel()
            action.activate()
        })

        it('should be deactivated before activation', done => {
            action.onceCancellable(
                () => done(Error('never be called')),
                err => {
                    err.message.should.eql('Deactivation')
                    done()
                })

            action.deactivate(Error('Deactivation'))
        })

        it('should not be activated with onceCancellable and throw', async () => {
            deactivateLater('Deactivation')

            try {
                action.onceCancellable(() => Error('never be called'))
                await action.next
                throw 'Should not be reached'
            } catch(e) {
                e.message.should.eql('Deactivation')
            }
        })
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
        activateLater()
        await action.next
    })

    it('all promises should resolve', async () => {
        let times = 0
        action.activate().activate()
        activateLater()
        activateLater()

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
        activateLater()
        activateLater()
        activateLater()

        let times = 0
        for await (let _ of action.future)
            if (++times == 3)
                break
    })
    
    it('should be activated multiple times then cancel', done => {
        let times = 0
        const cancel = action.onCancellable(() => times++)

        action.activate().activate()

        later(() => {
            cancel()
            action.activate()
            
            later(() => {
                times.should.eql(2)
                done()
            })
        })
    })
})

describe('Fancy Error Handling', () => {

    it('should cancel an event', async () => {
        activateLater()
        activateLater()
        cancelLater()
        activateLater()

        let times = 0
        for await (let _ of action.future)
            times++
        times.should.eql(2)
    })

    it('should activate many times, then deactivate', async () => {
        activateLater()
        activateLater()
        activateLater()
        deactivateLater('nothing')
        activateLater()

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

describe('Emitter with a value', () => {

    it('Classic, should be activated once with 12', done => {
        actionNumber.once(val => {
            if(val == 12)
                done()
        })
        actionNumber.activate(12)
    })

    it('Fancy, should be activated once with 12', async () => {
        activateLater(12)
        const val = await actionNumber.next
        val.should.eql(12)
    })

    it('Classic, should be activated three times increasing', done => {
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

    it('Fancy, Promise should not resolve unless listened to first', async () => {
        activateLater(55)

        actionNumber.activate(-100)
        actionNumber.count.should.eql(1)

        const num = await actionNumber.next
        num.should.eql(55)
    })
})
