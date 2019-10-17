export type ErrFn = (err: Error) => void

/** A function which takes an argument if it isn't undefined. */
export type OneArgFn<T> =
    Extract<T, void> extends never
        ? (arg: T) => void      // T does NOT have void in it
        : Exclude<T, void> extends never
            ? () => void        // T is ONLY void
            : (arg?: T) => void // T is a combination of void and non void
