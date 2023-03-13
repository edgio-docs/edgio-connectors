import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Analog app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { analogJSRoutes } from '@edgio/analogjs'
 *
 * export default new Router().use(analogJSRoutes)
 * ```
 */
export default class AnalogJSRoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.static('dist/server/public')
    }
    router.fallback(({ renderWithApp }) => {
      renderWithApp()
    })
  }
}
