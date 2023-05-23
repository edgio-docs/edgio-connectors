import { getSanityConfig } from './getSanityConfig'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { edgioRoutes } from '@edgio/core'

/**
 * Adds all routes from your Sanity Studio app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { sanityRoutes } from '@edgio/sanity-studio'
 *
 * export default new Router().use(sanityRoutes)
 * ```
 */

export default class SanityRoutes implements RouterPlugin {
  protected router?: Router

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild()) {
      const sanityConfig = getSanityConfig()
      const basePath = sanityConfig?.project?.basePath || ''

      // Serve SPA as 404 not found page for all routes by default,
      this.router?.match(`${basePath}/:path*`, ({ serveStatic, setResponseCode }) => {
        serveStatic('dist/index.html')
        setResponseCode(404)
      })

      // Serve all generated pages and the assets under basePath route
      this.router.static('dist', {
        paths: file => [`${basePath}/${file}`.replace(/\/\//g, '/')],
        rewritePathSource: `${basePath}/:path*`,
        handler: ({ setResponseCode }) => setResponseCode(200),
      })

      // Explicitly serve index.html on the desk route to avoid /desk#skd from returning 404
      this.router?.match(`${basePath}/desk`, ({ serveStatic, setResponseCode }) => {
        serveStatic('dist/index.html')
        setResponseCode(200)
      })
    } else {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
    this.router.use(edgioRoutes)
  }
}
