import GatsbyRoutes from './GatsbyRoutes'

/**
 * Adds all routes from your Gatsby app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { gatsbyRoutes } from '@edgio/gatsby'
 *
 * export default new Router().use(gatsbyRoutes)
 * ```
 */
export const gatsbyRoutes = new GatsbyRoutes()
