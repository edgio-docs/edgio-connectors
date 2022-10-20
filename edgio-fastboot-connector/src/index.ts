import FastbootRoutes from './FastbootRoutes'

/**
 * Adds all routes from your Fastboot app to the Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { fastbootRoutes } from '@edgio/fastboot'
 *
 * export default new Router().use(fastbootRoutes)
 * ```
 */
export const fastbootRoutes = new FastbootRoutes()
