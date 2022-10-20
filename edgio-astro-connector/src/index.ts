import AstroRoutes from './AstroRoutes'

/**
 * Adds all routes from your Astro app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { astroRoutes } from '@edgio/astro'
 *
 * export default new Router().use(astroRoutes)
 * ```
 */
export const astroRoutes = new AstroRoutes()
