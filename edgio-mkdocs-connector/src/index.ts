import MkDocsRoutes from './MkDocsRoutes'

/**
 * Adds all routes from your MkDocs app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { mkdocsRoutes } from '@edgio/mkdocs'
 *
 * export default new Router().use(mkdocsRoutes)
 * ```
 */
export const mkdocsRoutes = new MkDocsRoutes()
