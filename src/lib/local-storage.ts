const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const getItem = (key: string): string | null => {
  if (!canUseLocalStorage()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const setItem = (key: string, value: string): void => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // no-op
  }
}
