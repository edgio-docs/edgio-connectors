import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

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

export default class MkDocsRoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.static('site')
    } else {
      router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
