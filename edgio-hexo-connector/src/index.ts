import HexoRoutes from './HexoRoutes'

/**
 * Adds all routes from your Hexo app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { hexoRoutes } from '@edgio/hexo'
 *
 * export default new Router().use(hexoRoutes)
 * ```
 */
export const hexoRoutes = new HexoRoutes()
