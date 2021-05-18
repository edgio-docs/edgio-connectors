import FastbootRoutes from './FastbootRoutes'

/**
 * Adds all routes from your Fastboot app to the XDN router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@xdn/core/router'
 * import { fastbootRoutes } from '@xdn/fastboot'
 *
 * export default new Router().use(fastbootRoutes)
 * ```
 */
export const fastbootRoutes = new FastbootRoutes()
