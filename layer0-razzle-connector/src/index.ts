import RazzleRoutes from './RazzleRoutes'

/**
 * Adds all routes from your Razzle app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { RazzleRoutes } from '@layer0/Razzle'
 *
 * export default new Router().use(RazzleRoutes)
 * ```
 */
export const razzleRoutes = new RazzleRoutes()
