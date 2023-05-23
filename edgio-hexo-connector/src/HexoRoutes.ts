import { edgioRoutes } from '@edgio/core'
import loadHexoConfig from './loadHexoConfig'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

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

export default class HexoRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      const hexoConfig = loadHexoConfig()
      const publicDir = hexoConfig?.public_dir ?? 'public'

      if (!hexoConfig) {
        console.log(
          `> _config.yml was not found, switching to default value 'public' for 'public_dir' config option.`
        )
      }

      router.match('/:path*', ({ serveStatic, setResponseCode, setComment }) => {
        setComment('Serve 404 error page by default')
        serveStatic(`${publicDir}/404.html`)
        setResponseCode(404)
      })

      router.static(`${publicDir}`, {
        handler: ({ setResponseCode, setComment }) => {
          setComment('Serve generated pages and static assets')
          setResponseCode(200)
        },
      })
    } else {
      router.match('/:path*', ({ renderWithApp, setComment }) => {
        setComment('Render all paths using Hexo server in dev mode')
        renderWithApp()
      })
    }
    router.use(edgioRoutes)
  }
}
