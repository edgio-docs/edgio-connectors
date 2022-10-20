import RedwoodRoutes from './RedwoodRoutes'

/**
 * Adds all routes from your RedwoodJS app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { redwoodRoutes } from '@edgio/redwood'
 *
 * export default new Router().use(redwoodRoutes)
 * ```
 */
export const redwoodRoutes = new RedwoodRoutes()
