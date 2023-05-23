import AnalogJSRoutes from './AnalogJSRoutes'

/**
 * Adds all routes from your AnalogJS app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { analogjsRoutes } from '@edgio/analogjs'
 *
 * export default new Router().use(analogjsRoutes)
 * ```
 */
export const analogjsRoutes = new AnalogJSRoutes()
