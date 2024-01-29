import { join } from 'path'
import { AstroBuiltConfig, getAstroBuiltConfig } from './configUtils'
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
  protected astroBuiltConfig: AstroBuiltConfig

  constructor() {
    // Here we load the built Astro config from astro.config.json.
    // In dev mode we'll get default config.
    this.astroBuiltConfig = getAstroBuiltConfig()
  }

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild() || isCloud()) {
      const { output } = this.astroBuiltConfig
      if (output === 'static') {
        // static - fallbacks to pre-rendered 404 page
        this.add404ErrorPage()
      } else {
        // server or hybrid - fallbacks to SSR
        this.addDefaultSSRRoute()
      }
      this.addStaticAssets()
    } else {
      this.addDefaultSSRRoute()
    }
  }

  /**
   * Adds rule for static assets and static HTML pages
   */
  addStaticAssets() {
    const { outDir, output, base = '' } = this.astroBuiltConfig

    // If the output is static, we serve assets from the root directory
    // If the output is server or hybrid (Astro SSR),
    // we create serve static routes for the all assets under dist/client folder
    const assetsDir = output === 'static' ? outDir : join(outDir, 'client')

    this.router?.dir(
      assetsDir,
      ({ setComment, serveStatic }) => {
        setComment('Serve static assets and static HTML pages')
        serveStatic(`${assetsDir}/:path*`.replace(/\/\//g, '/'), {
          // We need to get just the path without the base path as rewrite dest,
          // because files in astro output folder are not put into the base path folder.
          rewritePathSource: `${base}/:path*`.replace(/\/\//g, '/'),
        })
      },
      {
        // When base path is set in astro config, we need to add it as prefix to the paths
        paths: (file: string) => [`${base}/${file}`.replace(/\/\//g, '/')],
      }
    )
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
    const { outDir } = this.astroBuiltConfig
    this.router?.match('/:path*', ({ serveStatic, setComment }) => {
      serveStatic(join(outDir, '404.html'))
      // TODO: Put back setResponseCode with 404 when the issue with empty cached responses from s3 is solved
      setComment('Serve pre-rendered 404 error page by default')
    })
  }
}
