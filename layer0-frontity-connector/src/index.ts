import FrontityRoutes from './FrontityRoutes'

/**
 * Adds all routes from your Frontity app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { frontityRoutes } from '@layer0/frontity'
 *
 * export default new Router().use(frontityRoutes)
 * ```
 */
export const frontityRoutes = new FrontityRoutes()
