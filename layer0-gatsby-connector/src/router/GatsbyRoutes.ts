import PluginBase from '@layer0/core/plugins/PluginBase'
import { BACKENDS } from '@layer0/core/constants'
import { isLayer0RunDev } from '@layer0/core/environment'
import { ResponseWriter, Router } from '@layer0/core/router'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const PUBLIC_CACHE_CONFIG = {
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

export default class GatsbyRoutes extends PluginBase {
  private readonly routeGroupName = 'gatsby_routes_group'
  private router?: Router

  /**
   * Called when plugin is registered
   * @param {Router} router
   */
  onRegister(router: Router) {
    this.router = router
    const handler = () => (res: ResponseWriter) => res.cache(PUBLIC_CACHE_CONFIG)

    this.router.group(this.routeGroupName, group => {
      // webpack hot loader for layer0 run
      if (isLayer0RunDev()) {
        group.match('/__webpack_hmr', ({ stream }) => stream(BACKENDS.js))
      }

      group.static('static', { handler })

      group.match('/:path*', ({ serveStatic, cache, proxy }) => {
        if (isLayer0RunDev()) {
          // Forward to Gatsby dev server
          proxy(BACKENDS.js)
        } else {
          cache(PUBLIC_CACHE_CONFIG)
          serveStatic('/public/:path*')
        }
      })
    })
  }
}
