import { join } from 'path'
import { readAsset } from './assets'
import { NuxtConfig } from './NuxtConfig'
import { RouterPlugin } from '@edgio/core/router/Router'
import { isLocal, isProductionBuild } from '@edgio/core/environment'
import { RouteHelper, Router, edgioRoutes } from '@edgio/core/router'

export const EDGIO_NUXT_CONFIG_PATH = '.edgio/edgio-nuxt.config.json'

export const FAR_FUTURE_TTL_WITH_UNIT = '10y'

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL_WITH_UNIT,
  },
}

export const browserAssetOpts = {
  permanent: true,
  exclude: ['service-worker.js', 'LICENSES'],
}

export default class NuxtRoutes implements RouterPlugin {
  private router?: Router
  private buildDir: string
  protected routesManifest: any
  private readonly config: NuxtConfig

  /**
   * Provides nuxt registered routes to router
   */
  constructor() {
    this.buildDir = ''
    this.config = {}
    if (isProductionBuild()) {
      this.config = <NuxtConfig>JSON.parse(readAsset(EDGIO_NUXT_CONFIG_PATH))

      // if static, we don't have routesManifest (nor do we need it), as that is generated during "nuxt build", not "nuxt generate"
      // these two nuxt "build" approaches are exclusive to each other in v2, eg. there's no way to use both
      if (this.config.target !== 'static') {
        this.buildDir = '.nuxt'
        if (this.config.buildDir) {
          console.log('> Found buildDir inside nuxt.config.* to be', `"${this.config.buildDir}"`)
          this.buildDir = this.config.buildDir
        }
      }
    }
  }

  /**
   * Called when plugin is registered. Creates a route group and add all nuxt routes into it.
   * @param {Router} router
   */
  onRegister(router: Router) {
    this.router = router
    this.addFallback()
    this.addNuxtRoutes()
    this.router.use(edgioRoutes)
  }

  /**
   * Adds catchAll route
   */
  addFallback() {
    if (this.config.target === 'static') {
      const fallback = this.config?.generate?.fallback
      let targetPage: string
      if (fallback === true) {
        // Display the custom 404 page
        targetPage = join('dist', '404.html')
      } else if (fallback === false) {
        return
      } else if (typeof fallback === 'string') {
        // Display the custom fallback page
        targetPage = join('dist', `${fallback}`)
      } else {
        // 200.html is generated by default
        targetPage = join('dist', '200.html')
      }
      this.log('[@edgio/nuxt] fallback', targetPage)

      this.router?.match('/:path*', ({ serveStatic }) => serveStatic(targetPage))
    } else {
      // if not static, it can also mean we're in dev mode
      this.router?.match('/:path*', ({ renderWithApp }) => renderWithApp())
      // BACKENDS.js not found error -> solve last, it's only performance related
      // this.router?.match('/:path*', renderNuxtPage)
    }
  }

  /**
   * Adds nuxt routes to router
   * @param {RouteGroup} group
   */
  private addNuxtRoutes() {
    this.addPages()
    this.addAssets()
  }

  addPages() {
    // edgio acts as a server for static files only for this case
    if (this.config.target !== 'static') return
    // output from npx nuxt generate
    this.router?.static('dist')
  }

  /**
   * Adds routes for static assets, including /static and /.nuxt/static
   * @param group
   */
  private addAssets() {
    /* istanbul ignore next */
    this.router?.static('static', {})

    if (isProductionBuild()) {
      this.router?.match('/service-worker.js', ({ serviceWorker }) => {
        serviceWorker(
          this.config.target === 'static'
            ? join('dist', '_nuxt', 'service-worker.js')
            : join(`${this.buildDir}`, 'dist', 'client', 'service-worker.js')
        )
      })

      this.router?.match('/_nuxt/:path*', ({ cache, serveStatic }) => {
        this.config.target === 'static'
          ? serveStatic(join('dist', '_nuxt', ':path*'))
          : serveStatic(join(`${this.buildDir}`, 'dist', 'client', ':path*'), browserAssetOpts)

        cache(FAR_FUTURE_CACHE_CONFIG)
      })
    } else {
      // webpack hot loader
      // TODO: enable once routehelper's stream method is implemented
      const streamHandler = ({ send }: RouteHelper) => send('NOT IMPLEMENTED', 200)
      this.router?.match('/__webpack_hmr/:path*', streamHandler)
      this.router?.match('/_nuxt/:hash.hot-update.json', streamHandler)

      this.router?.match('/_loading/:path*', streamHandler)
    }
  }

  private log(...messages: string[]) {
    isProductionBuild() && isLocal() && console.log(...messages)
  }
}
