import FrontityRoutes from './FrontityRoutes'

/**
 * Adds all routes from your Frontity app to the XDN router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@xdn/core/router'
 * import { frontityRoutes } from '@xdn/frontity'
 *
 * export default new Router().use(frontityRoutes)
 * ```
 */
export const frontityRoutes = new FrontityRoutes()
