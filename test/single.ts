import { spy } from 'sinon'
import { SafeSingleEmitter, SingleEmitter } from '../index.js'
import later from './later.js'

let simple: SafeSingleEmitter
let advance: SingleEmitter<number>

describe.only('Single usage', () => {
  beforeEach(() => {
    simple = new SafeSingleEmitter
    advance = new SingleEmitter
  })

  it('activated once', done => {
    simple.triggered.should.be.false()
    simple.then(done)
    simple.activate()
    simple.triggered.should.be.true()
  })

  it("should activate both once's", done => {
    const listener = spy()

    simple.then(listener)
    simple.then(listener)

    simple.activate()

    later(() => {
      listener.should.have.been.calledTwice()
      done()
    })
  })

  it('activated once again with 12', async () => {
    later(() => advance.activate(12))
    advance.triggered.should.be.false()
    const val = await advance
    advance.triggered.should.be.true()
    val.should.eql(12)
  })

  it('deactivated, never activated', done => {
    advance
      .then(() => { throw 'should not be reached' })
      .catch((error: Error) => {
        error.message.should.eql('Deactivation')
        done()
      })

    advance.deactivate(Error('Deactivation'))
    advance.triggered.should.be.true()
    advance.deactivated.should.be.true()
    advance.cancelled.should.be.false()
  })

  it('deactivated using `await` syntax', async () => {
    later(() => advance.deactivate(Error('Deactivation')))
    try {
      await advance
      throw 'should not be reached'
    } catch (error) {
      error.message.should.eql('Deactivation')
      advance.triggered.should.be.true()
      advance.deactivated.should.be.true()
      advance.cancelled.should.be.false()
    }
  })

  it('cancelled, never activated nor deactivated', done => {
    advance
      .then(() => done(Error('`fn` should never be called')))
      .catch(() => done(Error('`errFn` should never be called')))
      .finally(done)

    advance.cancel()
    advance.triggered.should.be.true()
    advance.deactivated.should.be.false()
    advance.cancelled.should.be.true()
  })

  it('cancelled using `await` syntax, NOT RECOMMENDED', async () => {
    later(advance.cancel)
    try {
      await advance
      throw 'should not be reached'
    } catch (error) {
      error.message.should.eql('Cancelled emitter gracefully')
      advance.triggered.should.be.true()
      advance.deactivated.should.be.false()
      advance.cancelled.should.be.true()
    }
  })

  it('should not throw `UnhandledPromiseRejection` for double deactivation', done => {
    // Swallow errors here
    advance.catch(() => { })

    advance.cancel()
    advance.deactivate(Error('deactivation'))
    advance.cancel()

    done()
  })
})
