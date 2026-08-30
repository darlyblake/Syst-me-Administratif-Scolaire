export function register() {
  if (typeof globalThis === 'undefined') return

  if (!('localStorage' in globalThis)) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      configurable: true,
    })
  }

  if (!('sessionStorage' in globalThis)) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      configurable: true,
    })
  }
}
