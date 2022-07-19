import Router from '@layer0/core/router/Router'
import PluginBase from '@layer0/core/plugins/PluginBase'
import RouteGroup from '@layer0/core/router/RouteGroup'

const ONE_HOUR = 60 * 60
const ONE_DAY = 24 * ONE_HOUR

/**
 * Adds all routes from your Shopify Hydrogen app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core'
 * import { shopifyHydrogenRoutes } from '@layer0/shopify-hydrogen'
 *
 * export default new Router().use(shopifyHydrogenRoutes)
 * ```
 */
export default class ShopifyHydrogenRoutesRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'shopify_hydrogen_routes'

  /**
   * Called when plugin is registered. Adds a route for static assets.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.router
      .group(this.routeGroupName, group => this.addRoutesToGroup(group))
      .fallback(({ renderWithApp }) => renderWithApp())
  }

  private addRoutesToGroup(group: RouteGroup) {
    group
      .match('/assets/:path*', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
            forcePrivateCaching: true,
          },
          browser: {
            maxAgeSeconds: 0,
            serviceWorkerSeconds: ONE_DAY,
          },
        })
      })
      .match('/', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
          },
          browser: false,
        })
      })
      .match('/collections', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
          },
          browser: false,
        })
      })
      .match('/products', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
          },
          browser: false,
        })
      })
      .match('/journal', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
          },
          browser: false,
        })
      })
      .match('/collections/:path*', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
          },
          browser: false,
        })
      })
      .match('/products/:path*', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
            forcePrivateCaching: true,
          },
          browser: {
            maxAgeSeconds: 0,
            serviceWorkerSeconds: ONE_DAY,
          },
        })
      })
      .match('/journal/:path*', ({ cache }) => {
        cache({
          edge: {
            maxAgeSeconds: ONE_DAY,
            forcePrivateCaching: true,
          },
          browser: {
            maxAgeSeconds: 0,
            serviceWorkerSeconds: ONE_DAY,
          },
        })
      })
  }
}
