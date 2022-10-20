import RazzleRoutes from './RazzleRoutes'

/**
 * Adds all routes from your Razzle app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { RazzleRoutes } from '@edgio/razzle'
 *
 * export default new Router().use(RazzleRoutes)
 * ```
 */
export const razzleRoutes = new RazzleRoutes()
