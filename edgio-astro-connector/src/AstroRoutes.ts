import { join } from 'path'
import { edgioRoutes } from '@edgio/core'
import getAstroConfig from './getAstroConfig'
import { isCloud, isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your Astro app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { astroRoutes } from '@edgio/astro'
 *
 * export default new Router().use(astroRoutes)
 * ```
 */

export default class AstroRoutes implements RouterPlugin {
  protected router?: Router
  protected astroConfig = getAstroConfig()

  constructor() {
    this.astroConfig = getAstroConfig()
  }

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild() || isCloud()) {
      const { output } = this.astroConfig
      if (output === 'server') this.addDefaultSSRRoute()
      if (output === 'static') this.add404ErrorPage()
      this.addStaticAssets()
    } else {
      this.addDefaultSSRRoute()
    }
    router.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker(join('.edgio', 'tmp', 'service-worker.js'))
    })
    router.use(edgioRoutes)
  }

  /**
   * Adds rule for static assets and static HTML pages
   */
  addStaticAssets() {
    const { outDir, output } = this.astroConfig

    // If the output is static, we serve assets from the static directory
    // If the output is server (Astro SSR), we create serve static routes for the all the assets under dist/client folder
    const assetsDir = output === 'server' ? join(outDir, 'client') : outDir

    this.router?.static(assetsDir, {
      handler: ({ setComment }) => {
        setComment('Serve static assets and static HTML pages')
      },
    })
  }

  /**
   * Forwards all unmatched requests to the Astro app for processing.
   */
  addDefaultSSRRoute() {
    this.router?.match('/:path*', ({ renderWithApp, setComment }) => {
      renderWithApp()
      setComment('Send all requests to Astro server running in serverless by default')
    })
  }

  /**
   * Serves prerendered 404 error page with the correct status code
   */
  add404ErrorPage() {
    const { outDir } = this.astroConfig
    this.router?.match('/:path*', ({ serveStatic, setComment }) => {
      serveStatic(join(outDir, '404.html'))
      // TODO: Put back setResponseCode with 404 when the issue with empty cached responses from s3 is solved
      setComment('Serve pre-rendered 404 error page by default')
    })
  }
}
