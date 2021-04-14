import slash from 'slash'

/**
 * Converts sapper path to express route syntax
 *
 * **example**
 *
 * /[param1]/[param2].svelte => /:param1/:param2
 */
export default (pagePath: string) => {
  return slash(
    `/${pagePath
      .replace(/\.[^.]*$/, '') // Remove extensions
      .replace(/(^|\/)index(\..*)?$/, '$2')}` // Remove index or return root for empty for example: /index.js will result with /
  ).replace(/\[([^\]]+)\]/g, ':$1')
}
