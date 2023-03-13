import QwikRoutes from './QwikRoutes'

/**
 * Adds all routes from your Qwik app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { qwikRoutes } from '@edgio/qwik'
 *
 * export default new Router().use(qwikRoutes)
 * ```
 */
export const qwikRoutes = new QwikRoutes()
