import NitropackRoutes from './nitropackRoutes'

/**
 * Adds all routes from your Nitropack app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { nitropackRoutes } from '@edgio/nitropack'
 *
 * export default new Router().use(nitropackRoutes)
 * ```
 */
export const nitropackRoutes = new NitropackRoutes()
