import PluginBase from '@layer0/core/plugins/PluginBase'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { Router } from '@layer0/core/router'
import RouteGroup from '@layer0/core/router/RouteGroup'
import { isProductionBuild } from '@layer0/core/environment'

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

export default class NuxtRoutes extends PluginBase {
  private readonly nuxtRouteGroupName = 'nuxt_routes_group'
  private router?: Router

  /**
   * Provides nuxt registered routes to router
   */
  constructor() {
    super()
    const nuxtDir = join(process.cwd(), '.nuxt')

    /* istanbul ignore if */
    if (!existsSync(nuxtDir)) {
      mkdirSync(nuxtDir)
    }
  }

  /**
   * Called when plugin is registered. Creates a route group and add all nuxt routes into it.
   * @param {Router} router
   */
  onRegister(router: Router) {
    this.router = router
    this.router.group(this.nuxtRouteGroupName, group => this.addNuxtRoutesToGroup(group))
    this.addFallback()
  }

  /**
   * Adds nuxt routes to route group
   * @param {RouteGroup} group
   */
  private addNuxtRoutesToGroup(group: RouteGroup) {
    this.addAssets(group)
  }

  /**
   * Forwards all unmatched requests to the Nuxt app for processing.
   */
  addFallback() {
    /* istanbul ignore next - optional chaining */
    this.router?.fallback(({ renderWithApp }) => {
      renderWithApp()
    })
  }

  /**
   * Adds routes for static assets, including /static and /.nuxt/static
   * @param group
   */
  private addAssets(group: RouteGroup) {
    group.match('/service-worker.js', ({ serviceWorker }) =>
      serviceWorker('.output/public/_nuxt/service-worker.js')
    )

    if (isProductionBuild()) {
      group.static('.output/public', {
        ignore: '_nuxt/**/*',
        handler: file => res => res.cache(PUBLIC_CACHE_CONFIG),
      })

      group.match('/_nuxt/:path*', async ({ serveStatic, cache }) => {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('.output/public/_nuxt/:path*', {
          exclude: ['service-worker.js', 'LICENSES'],
          permanent: true,
        })
      })
    } else {
      /* istanbul ignore next */
      group.static('static', { handler: () => res => res.cache(PUBLIC_CACHE_CONFIG) })

      // browser js
      group.match('/_nuxt/:path*', async ({ renderWithApp, cache }) => {
        // since Nuxt doesn't add a hash to asset file names in dev, we need to prevent caching,
        // otherwise Nuxt is prone to getting stuck in a browser refresh loop after making changes due to assets
        // failing to load without error.
        cache({ browser: false })
        renderWithApp({ removeEmptySearchParamValues: true })
      })
    }
  }
}
