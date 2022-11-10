import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'

/**
 * Adds all routes from your Shopify Hydrogen app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core'
 * import { shopifyHydrogenRoutes } from '@edgio/shopify-hydrogen'
 *
 * export default new Router().use(shopifyHydrogenRoutes)
 * ```
 */

export default class ShopifyHydrogenRoutesRoutes extends PluginBase {
  private router?: Router

  /**
   * Called when plugin is registered. Adds a route for static assets.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.router.fallback(({ renderWithApp }) => renderWithApp())
  }
}
