import FrontityRoutes from './FrontityRoutes'

/**
 * Adds all routes from your Frontity app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { frontityRoutes } from '@edgio/frontity'
 *
 * export default new Router().use(frontityRoutes)
 * ```
 */
export const frontityRoutes = new FrontityRoutes()
