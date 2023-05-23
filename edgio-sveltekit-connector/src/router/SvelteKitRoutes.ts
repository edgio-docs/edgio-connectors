import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { PUBLIC_CACHE_CONFIG } from './cacheConfig'
import { edgioRoutes } from '@edgio/core'

/**
 * An Edgio middleware that automatically adds all standard SvelteKit routes to Edgio router.
 * These include route for pages in src/routes and static assets in the static directory.
 */
export default class SvelteKitRoutes implements RouterPlugin {
  protected router?: Router

  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.addDefaultSSRRoute()
    if (isProductionBuild()) {
      this.addStaticAssets()
      this.addServiceWorker()
    } else {
      this.addWebpackRoutes()
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
    this.router?.static('.svelte-kit/output/client', {
      handler: ({ cache }) => cache(PUBLIC_CACHE_CONFIG),
    })
  }

  /**
   * Add rule for service-worker.js
   */
  protected addServiceWorker() {
    // From the sveltekit docs: https://kit.svelte.dev/docs#modules-service-worker
    // Because it needs to be bundled (since browsers don't yet support import in this context),
    // and depends on the client-side app's build manifest, service workers only work in the
    // production build, not in development.
    this.router?.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker(`.svelte-kit/output/client/service-worker.js`)
    })
  }

  /**
   * Add rule for webpack hot loader.
   * This is only used in development mode.
   */
  protected addWebpackRoutes() {
    // TODO: Uncomment this when stream method is implemented
    // this.router?.match('/_app', ({ stream }) => stream('__js__'))
    // this.router?.match('/.svelte-kit/:path*', ({ stream }) => stream('__js__'))
    // this.router?.match('/src/:path*', ({ stream }) => stream('__js__'))
    // this.router?.match('/node_modules/:path*', ({ stream }) => stream('__js__'))
    // this.router?.match('/@vite/:path*', ({ stream }) => stream('__js__'))
  }
}
