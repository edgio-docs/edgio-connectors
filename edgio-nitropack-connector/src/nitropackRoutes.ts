import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Nitropack app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { nitropackRoutes } from '@edgio/nitropack'
 *
 * export default new Router().use(nitropackRoutes)
 * ```
 */
export default class ReactCRARoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.static('.output/public')
    }
    router.fallback(({ renderWithApp }) => {
      renderWithApp()
    })
  }
}
