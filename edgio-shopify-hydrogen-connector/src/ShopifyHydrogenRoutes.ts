import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { edgioRoutes } from '@edgio/core'

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

export default class ShopifyHydrogenRoutesRoutes implements RouterPlugin {
  protected router?: Router

  /**
   * Called when plugin is registered.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.router?.match('/:path*', ({ renderWithApp }) => renderWithApp())
    this.router.use(edgioRoutes)
  }
}
