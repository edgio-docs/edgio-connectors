import VueRoutes from './vue-cva/VueRoutes'

/**
 * Adds all routes from your Vue 3 app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { vue3Routes } from '@edgio/vue-3'
 *
 * export default new Router().use(vue3Routes)
 * ```
 */
export default class Vue3Routes extends VueRoutes {}
