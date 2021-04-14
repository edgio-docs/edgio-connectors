import FastbootRoutes from './FastbootRoutes'

/**
 * Adds all routes from your Fastboot app to the Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { fastbootRoutes } from '@layer0/fastboot'
 *
 * export default new Router().use(fastbootRoutes)
 * ```
 */
export const fastbootRoutes = new FastbootRoutes()
