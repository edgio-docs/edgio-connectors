import SanityRoutes from './SanityRoutes'

/**
 * Adds all routes from your Sanity Studio app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { sanityRoutes } from '@edgio/sanity-studio'
 *
 * export default new Router().use(sanityRoutes)
 * ```
 */
export const sanityRoutes = new SanityRoutes()
