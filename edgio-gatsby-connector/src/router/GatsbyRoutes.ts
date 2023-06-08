import { join } from 'path'
import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

export default class GatsbyRoutes implements RouterPlugin {
  protected router?: Router

  /**
   * Called when plugin is registered
   * @param {Router} router
   */

  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild()) {
      this.addProdRoutes()
    } else {
      this.addDevRoutes()
    }
    router.use(edgioRoutes)
  }

  /**
   * Add routes for production mode
   */
  protected addProdRoutes() {
    const gatsbyConfig = nonWebpackRequire(join(process.cwd(), 'gatsby-config.js'))
    const pathPrefix = gatsbyConfig?.pathPrefix || ''

    // Serve 404 error page
    this.router?.match('/(.*)', ({ serveStatic, setResponseCode, compute }) => {
      serveStatic(join('public', '404.html'))
      setResponseCode(404)
    })

    // Serve static pages
    this.router?.static('public', {
      paths: file => [join(pathPrefix, file).replace(/\/\//g, '/')],
      rewritePathSource: `${pathPrefix}/:path*`,
      handler: ({ setResponseCode }) => setResponseCode(200),
    })
  }

  /**
   * Add routes for development mode
   */
  protected addDevRoutes() {
    // Proxy everything to the gatsby development server by default
    this.router?.match('/(.*)', ({ renderWithApp }) => {
      renderWithApp()
    })

    // TODO: Uncomment this when stream method is implemented
    // Stream webpack changes
    // this.router?.match('/__webpack_hmr', ({ stream }) => stream(BACKENDS.js))
  }
}
