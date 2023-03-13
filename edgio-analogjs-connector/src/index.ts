import AnalogJSRoutes from './AnalogJSRoutes'

/**
 * Adds all routes from your Nitropack app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { analogJSRoutes } from '@edgio/analogjs'
 *
 * export default new Router().use(analogJSRoutes)
 * ```
 */
export const analogJSRoutes = new AnalogJSRoutes()
