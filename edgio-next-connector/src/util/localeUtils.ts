/**
 * Removes the locale part from the start of path
 * if it starts with one of the locales
 * @param path E.g /en-US/p/[id]
 * @param locales array of locales
 * @returns the path minus the locale, e.g /p/[id]
 */
export function removeLocale(path: string, locales: string[] = []) {
  if (!startsWithLocale(path, locales)) return path
  const [_, _locale, ...rest] = path.split('/')
  return '/' + rest.join('/')
}

/**
 * Returns true if the path starts with one of the locales
 * @param path E.g /en-US/p/[id]
 * @param locales array of locales
 * @returns
 */
export function startsWithLocale(path: string, locales: string[]) {
  return locales.length > 0 && new RegExp(`^/(${locales.join('|')})(/|$)`).test(path)
}
