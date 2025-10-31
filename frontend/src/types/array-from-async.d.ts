// Declaration files with no imports/exports augment the global scope,
// so the ArrayConstructor extension is visible everywhere without extra wiring.
// Because that config’s "include" is ["./src"], this file is included automatically.

// Temporary polyfill typings for Array.fromAsync until TypeScript ships them in the standard lib.
declare interface ArrayConstructor {
  fromAsync<T>(
    source: AsyncIterable<T> | Iterable<Promise<T> | T>
  ): Promise<Array<Awaited<T>>>;
  fromAsync<T, U>(
    source: AsyncIterable<T> | Iterable<Promise<T> | T>,
    mapfn: (value: Awaited<T>, index: number) => U | PromiseLike<U>,
    thisArg?: unknown
  ): Promise<Array<Awaited<U>>>;
}
