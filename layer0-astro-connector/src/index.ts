import AstroRoutes from './AstroRoutes'

/**
 * Adds all routes from your Astro app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { astroRoutes } from '@layer0/astro'
 *
 * export default new Router().use(astroRoutes)
 * ```
 */
export const astroRoutes = new AstroRoutes()
