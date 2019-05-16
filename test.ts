import 'should'
import Emitter, { merge } from './index' // vs. '.'. This prevents TS5055 for `dist/index.d.ts`

// These could probably be imported from 'mocha', but I am not sure where.
type MochaSyncTest = (done: any) => void
type MochaAsyncTest = () => Promise<any>
type MochaSuite = { [suite: string]: MochaSuite | MochaAsyncTest | MochaSyncTest }

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

let action: Emitter
let actionNumber: Emitter<number>

export = {
    beforeEach() {
        action = new Emitter
        actionNumber = new Emitter
    },

    'Classical Listeners': {
        'activated once': done => {
            action.once(done)
            action.activate()
        },

        'deactivated, never activated': done => {
            action
                .once(() => { throw 'should not be reached' })
                .catch(e => {
                    e.message.should.eql('Deactivation')
                    done()
                })

            action.deactivate(Error('Deactivation'))
        },

        'cancelled, never activated': done => {
            action
                .once(() => done(Error('`fn` should never be called')))
                .catch(() => done(Error('`errFn` should never be called')))

            action.cancel()
            done()
        },

        'activated three times': done => {
            let times = 0
            action.on(() => {
                if (++times == 3)
                    done()
            })

            action.activate().activate().activate()
            action.count.should.eql(3)
        },

        'activated more times': done => {
            let times = 0
            action.on(() => times++)
            action.on(() => {
                if (++times == 6)
                    done()
            })

            action.activate().activate().activate()
        },

        'should activate both once\'s': done => {
            let times = 0
            const hit = () => {
                if (++times >= 2)
                    done()
            }
            action.once(hit)
            action.once(hit)

            action.activate()
            action.count.should.eql(1)
        },

        'Cancellable Emitters': {
            'activated once and not cancelled': done => {
                action.onceCancellable(done)
                action.activate()
            },

            'entirely cancelled before activation': done => {
                action.onceCancellable(
                    () => done(Error('`fn` should never be called')),
                    () => done(Error('`errFn` should never be called')))

                action.cancel()
                action.activate()
                done()
            },

            'cancelled before activation': done => {
                const cancel = action.onceCancellable(
                    () => done(Error('`fn` should never be called')),
                    () => done(Error('`errFn` should never be called')))
                action.once(done)

                cancel()
                action.activate()
            },

            'deactivated before activation': done => {
                action.onceCancellable(
                    () => done(Error('never be called')),
                    err => {
                        err.message.should.eql('Deactivation')
                        done()
                    })

                action.deactivate(Error('Deactivation'))
            },

            'deactivation throws, never activats onceCancellable': async () => {
                deactivateLater('Deactivation')

                try {
                    action.onceCancellable(() => Error('never be called'))
                    await action.next
                    throw 'Should not be reached'
                } catch (e) {
                    e.message.should.eql('Deactivation')
                }
            },
        },
    },

    'Classical Error Handling': {
        'cancel an event': done => {
            let times = 0
            action.on(() => {
                if (++times >= 2)
                    done()
            })

            action.activate()
                .activate()
                .cancel()
                .activate()
        },

        'continue activate even after an error': done => {
            let times = 0
            action.onContinueAfterError(
                () => {
                    if (times++ == 100)
                        done()
                },
                (err) => {
                    err.should.be.an.instanceOf(Error)
                    if (times == 3)
                        times = 100
                })

            action.activate()
                .activate()
                .activate()
                .deactivate(Error('nothing'))
                .activate()
        },

        'continue activate even after a cancellation': done => {
            action.onContinueAfterError(
                () => action.count == 3 && done(),
                err => done(err))

            action.activate()
                .cancel('nothing')
                .activate()
        },
    },

    'Fancy Listeners': {
        'Next promise should resolve': async () => {
            activateLater()
            await action.next
        },

        'Previous promise should resolve': () => {
            (typeof action.previous).should.eql('undefined')
            action.activate()
            action.previous.should.not.equal(action.next)
            action.previous.should.have.been.fulfilled()
        },

        'all promises should resolve': async () => {
            let times = 0
            action.activate().activate()
            activateLater()
            activateLater()

            for await (let _ of action.all)
                if (++times == 4)
                    break
        },

        'promises from past should resolve': async () => {
            let times = 0
            action.activate().activate()

            for await (let _ of action.past)
                times++
            action.count.should.eql(2)
            times.should.eql(2)
        },

        'activated three times': async () => {
            activateLater()
            activateLater()
            activateLater()

            let times = 0
            for await (let _ of action.future)
                if (++times == 3)
                    break
        },

        'activated multiple times then cancel': async () => {
            let times = 0
            const cancel = action.onCancellable(() => times++)

            action.activate().activate()

            return new Promise(resolve => {
                later(() => {
                    cancel()
                    action.activate()

                    later(() => {
                        times.should.eql(2)
                        resolve()
                    })
                })
            })
        },
    },

    'Fancy Error Handling': {
        'should cancel an event': async () => {
            activateLater()
            activateLater()
            cancelLater()
            activateLater()

            let times = 0
            for await (let _ of action.future)
                times++
            times.should.eql(2)
        },

        'should activate many times, then deactivate': async () => {
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
        },
    },

    'Emitter with a value': {
        'Classic, activated once with 12': done => {
            actionNumber.once(val => {
                if (val == 12)
                    done()
            })
            actionNumber.activate(12)
        },

        'Fancy, activated once with 12': async () => {
            activateLater(12)
            const val = await actionNumber.next
            val.should.eql(12)
        },

        'Classic, activated three times increasing': done => {
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
        },

        'Fancy, Promise should not resolve unless listened to first': async () => {
            activateLater(55)

            actionNumber.activate(-100)
            actionNumber.count.should.eql(1)

            const num = await actionNumber.next
            num.should.eql(55)
        },
    },

    'Merged Emitter': done => {
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

            if (actionTimes >= 2 && actionNumberTimes >= 2)
                done()
        })

        activateLater()
        merged.activate({ name: 'action' })

        activateLater(12)
        merged.activate({ name: 'actionNumber', value: 12 })
    },
} as MochaSuite
