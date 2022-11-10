import ReactCRARoutes from './reactCRARoutes'

/**
 * Adds all routes from your React CRA app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { reactCRARoutes } from '@edgio/react-cra'
 *
 * export default new Router().use(reactCRARoutes)
 * ```
 */
export const reactCRARoutes = new ReactCRARoutes()
