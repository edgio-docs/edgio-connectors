import { BACKENDS } from '@xdn/core/constants'
import PluginBase from '@xdn/core/plugins/PluginBase'
import { Router } from '@xdn/core/router'
import { getBuildPath } from '../utils/getBuildPath'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const PUBLIC_CACHE_CONFIG = {
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

export default class AngularRoutes extends PluginBase {
  angularRouteGroupName = 'angular_routes_group'

  /**
   * Called when plugin is registered
   * @private
   * @param router
   */
  onRegister(router: Router) {
    const buildPath = getBuildPath()

    router.group(this.angularRouteGroupName, group => {
      group.match('/service-worker.js', ({ serviceWorker }) => {
        serviceWorker(`dist/__xdn__/service-worker.js`)
      })
      group.match('/assets/:path*', ({ cache, serveStatic }) => {
        cache(PUBLIC_CACHE_CONFIG)
        serveStatic(`${buildPath}/assets/:path`)
      })
      group.static(buildPath, {
        handler: () => res => res.cache(PUBLIC_CACHE_CONFIG),
        glob: `*`,
      })
      group.match('/:path*', async ({ proxy }) => {
        proxy(BACKENDS.js)
      })
    })
  }
}
