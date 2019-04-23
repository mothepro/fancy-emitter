# Fancy Emitter
> A new take on JavaScript's EventEmitter class. Makes use of types and the newest JS features.

This event emitter makes use of asynchronous functions and generators.

## How to Use
Create a new emitter.

```typescript
import Emitter from 'fancy-emitter'
const action = new Emitter<number>();
```

Set a listener on the action. 
```typescript
const value = await action.next
```

Or listen to many events which will occur.
```typescript
let total = 0
for await (const value of action.all)
  total += value
```

Then activate the emitter whenever you please `action.activate(12)`

The loop listeners may be gracefully broken out of with `action.cancel()`
or by throwing an error with `action.deactivate(Error('err'))`.

### Classic
This can also be used like a classic event emitter with callbacks set to the `on` and `once` methods.
```typescript
const action = new Emitter<string>()

action.on(data => console.log(data))

action.activate('hello')
action.activate('world')
```

These listeners provide more functionality in that they can be cancelled.
```typescript
const action = new Emitter<string>()

const cancel = action.onCancellable(data => console.log(data))
action.once(str => {
    if (str == 'world')
        cancel()
})

action.activate('hello')
action.activate('world')

action.activate('this will be shown')
setTimeout(() => action.activate('but this won\'t. Since it occurs AFTER the cancel has time to propagate'))
```

Listeners can also be continued after an error occurs.
```typescript
const action = new Emitter<number>()

action.on(data => console.log(data)) // 1 2
action.onContinueAfterError(
    data => console.log(data),
    err => console.warn(err)) // 1 2 error 3

action.activate(1)
action.activate(2)
action.deactivate(Error('error'))
action.activate(3)
```

## API
The emitter is the union between two interfaces.

+ A Listener, which only detects when an event occurred.
```typescript
interface Listener<T = void> {
    // Resolves when event is activated. Rejects when event is deactivated or cancelled.
    readonly next: Promise<T>

    // Iterator over ALL events which have occurred and will occur.
    readonly all: AsyncIterableIterator<T>

    // Iterator over the FUTURE events which will occur.
    readonly future: AsyncIterableIterator<T>

    // Iterator over PAST events, which have already occurred.
    readonly past: AsyncIterableIterator<T>

    // The number of times this event has been activated or deactivated.
    readonly count: number
    
    once(fn: OneArgFn<T>): Promise<void>
    onceCancellable(fn: OneArgFn<T>, errFn?: (err: Error) => void): Function
    on(fn: OneArgFn<T>): Promise<void>
    onCancellable(fn: OneArgFn<T>, errFn?: (err: Error) => void): Function
    onContinueAfterError(fn: OneArgFn<T>, errFn: (err: Error) => void): void
}
```

+ A Broadcaster which can only trigger events.
```typescript
interface Broadcaster<T = void> {
    activate(...arg: Parameters<OneArgFn<T>>): this
    deactivate(err: Error): this
    cancel(): this
}
```

In the above interfaces the `OneArgFn` type refers to a function which takes an argument iff it isn't `void`.
```typescript
type OneArgFn<T> = T extends void
    ? () => void
    : (arg: T) => void
```

## CDN
Use the CDN from unpkg!
```html
<script src="//unpkg.com/fancy-emitter@0.0.7/dist/index.js"></script>
```