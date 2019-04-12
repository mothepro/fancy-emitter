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

### Classic
This can also be used like a classic event emitter with callbacks set to the `on` and `once` methods.

Example:
```typescript
const action = new Emitter<string>()

action.on(data => console.log(data))

action.activate('hello')
action.activate('world')
```


## API
The emitter is the union between two interfaces.

+ A Listener, which only detects when an event occurred.

```typescript
interface Listener<T = void> {
    readonly next: Promise<T>
    readonly all: AsyncIterableIterator<T>
    readonly count: number
    
    once(fn: OneArgFn<T>): void
    on(fn: OneArgFn<T>): void
    every(fn: OneArgFn<T>, errFn: OneArgFn<Error>): void
}
```

+ A Broadcaster which can only trigger events.
```typescript
interface Broadcaster<T> {
    activate(...arg: Parameters<OneArgFn<T>>): void
    deactivate(err: Error): void
    cancel(): void
}
```
