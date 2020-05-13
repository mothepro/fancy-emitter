/**
 * Calls a function after the current thread is complete.
 * 
 * `setTimeout` is used to run a function after the listeners are put in place.
 * In practice this would never need to be done since the thread activating the
 * event is not the same as the one listening.
 */
export default function (fn: Function) {
    setTimeout(fn)
}
