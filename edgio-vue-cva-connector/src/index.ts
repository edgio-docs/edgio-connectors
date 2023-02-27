import VueRoutes from './VueRoutes'

/**
 * Adds all routes from your Vue app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { vueRoutes } from '@edgio/vue-cva'
 *
 * export default new Router().use(vue3Routes)
 * ```
 */
export const vueRoutes = new VueRoutes()
