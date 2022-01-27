import RedwoodRoutes from './RedwoodRoutes'

/**
 * Adds all routes from your RedwoodJS app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { redwoodRoutes } from '@layer0/redwood'
 *
 * export default new Router().use(redwoodRoutes)
 * ```
 */
export const redwoodRoutes = new RedwoodRoutes()
