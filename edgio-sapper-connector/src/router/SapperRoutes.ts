import path from 'path'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { PUBLIC_CACHE_CONFIG, FAR_FUTURE_CACHE_CONFIG } from './cacheConfig'
import { edgioRoutes } from '@edgio/core'

/**
 * An Edgio middleware that automatically adds all standard Sapper routes to Edgio router.
 * These include pages in src/routes and static assets in the static directory.
 */
export default class SapperRoutes implements RouterPlugin {
  protected sapperRootDir: string
  protected pagesDir: string
  protected pagesDirRelative: string
  protected router?: Router

  constructor() {
    this.sapperRootDir = process.cwd()
    this.pagesDirRelative = path.join('src', 'routes')
    this.pagesDir = path.join(this.sapperRootDir, this.pagesDirRelative)
  }

  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.addDefaultSSRRoute()
    if (isProductionBuild()) {
      this.addClientRoutes()
      this.addStaticAssets()
      this.addServiceWorker()
    } else {
      this.addWebpackRoute()
    }
    this.router.use(edgioRoutes)
  }

  /**
   * Add default SSR rule
   */
  protected addDefaultSSRRoute() {
    this.router?.match('/:path*', ({ renderWithApp }) => renderWithApp())
  }

  /**
   * Add rule for static assets from static folder
   */
  protected addStaticAssets() {
    this.router?.static('static', {
      handler: ({ cache }) => cache(PUBLIC_CACHE_CONFIG),
    })
  }

  /**
   * Add rule for service-worker.js
   */
  protected addServiceWorker() {
    this.router?.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker(
        `__sapper__/${process.env.NODE_ENV === 'production' ? 'build' : 'dev'}/service-worker.js`
      )
    })
  }

  /**
   * Add rule for webpack hot loader.
   * This is only used in development mode.
   */
  protected addWebpackRoute() {
    // TODO: Uncomment this when stream method is implemented
    // this.router?.match('/__sapper__', ({ stream }) => {
    //   stream(SERVERLESS_ORIGIN_NAME)
    // })
  }

  /**
   * Add rule for /client/:path* pages
   */
  protected addClientRoutes() {
    this.router?.match('/client/:path*', ({ serveStatic, cache }) => {
      serveStatic('__sapper__/build/client/:path*')
      cache(FAR_FUTURE_CACHE_CONFIG)
    })
  }
}
