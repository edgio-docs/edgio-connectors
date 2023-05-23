import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { isProductionBuild } from '@edgio/core/environment'
import { edgioRoutes } from '@edgio/core'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

const PUBLIC_CACHE_CONFIG = {
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

export const browserAssetOpts = {
  permanent: true,
  exclude: ['LICENSES'],
}

export default class NuxtRoutes implements RouterPlugin {
  private router?: Router

  /**
   * Called when plugin is registered. Creates a route group and add all nuxt routes into it.
   * @param {Router} router
   */
  onRegister(router: Router) {
    this.router = router
    this.addFallback()
    this.addAssets()
    router.use(edgioRoutes)
  }

  /**
   * Forwards all unmatched requests to the Nuxt app for processing.
   */
  addFallback() {
    /* istanbul ignore next - optional chaining */
    this.router?.match('/:path*', ({ renderWithApp }) => {
      renderWithApp()
    })
  }

  /**
   * Adds routes for static assets, including /static and /.nuxt/static
   * @param group
   */
  private addAssets() {
    if (isProductionBuild()) {
      this.router?.static('.output/public', {
        ignore: '_nuxt/**/*',
        handler: ({ cache }) => cache(PUBLIC_CACHE_CONFIG),
      })

      this.router?.match('/_nuxt/:path*', async ({ serveStatic, cache }) => {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('.output/public/_nuxt/:path*', {
          permanent: true,
        })
      })
      this.router?.match('/service-worker.js', ({ serviceWorker }) =>
        serviceWorker('.output/public/_nuxt/service-worker.js')
      )
    } else {
      this.router?.match('/:path*', {
        url: {
          url_rewrite: [
            {
              source: '=(&|$)',
              destination: '$1',
            },
          ],
        },
      })

      /* istanbul ignore next */
      this.router?.static('static', { handler: ({ cache }) => cache(PUBLIC_CACHE_CONFIG) })
    }
  }
}
