import { notFoundPageHTML } from './404'
import loadHexoConfig from './loadHexoConfig'
import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Hexo app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { hexoRoutes } from '@edgio/hexo'
 *
 * export default new Router().use(hexoRoutes)
 * ```
 */

export default class HexoRoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      const hexoConfig = loadHexoConfig()
      router.static(hexoConfig?.public_dir ?? 'public')
      router.fallback(({ send }) => {
        send(notFoundPageHTML, 404, 'Not Found')
      })
    } else {
      router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
