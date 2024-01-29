import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { FAR_FUTURE_CACHE_CONFIG, PUBLIC_CACHE_CONFIG } from './constants'
import { join } from 'path'
import { TMP_DIR } from '@edgio/core/deploy/paths'
import { PRERENDERED_PAGES_FOLDER } from './constants'
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
      this.addPrerenderedPages()
      this.addServiceWorker()
    }
  }

  /**
   * Add default SSR rule
   */
  protected addDefaultSSRRoute() {
    this.router?.match('/:path*', ({ renderWithApp, setComment }) => {
      renderWithApp()
      setComment('Send all requests to Astro server running in serverless by default')
    })
  }

  /**
   * Add rule for static assets from '.svelte-kit/output/' folder
   */
  protected addStaticAssets() {
    this.router?.static('.svelte-kit/output/client', {
      // The assets in /client/ folder don't have any hash,
      // so we can cache them only on the edge.
      handler: ({ cache, setComment }) => {
        cache(PUBLIC_CACHE_CONFIG)
        setComment('Serve static assets')
      },
    })
    // The assets in /client/_app/ folder are with unique hash,
    // so we can cache them in the browser too.
    this.router?.match('/_app/:path*', ({ cache, setComment }) => {
      cache(FAR_FUTURE_CACHE_CONFIG)
      setComment('Cache static assets with hash in the browser')
    })
  }

  /**
   * Add rule for prerendered pages from '.svelte-kit/output/prerendered/pages' folder
   */
  protected addPrerenderedPages() {
    // The pages need to be renamed to correct path first.
    // This is done by us during build process.
    // Example: /about.html => /about/index.html
    this.router?.static(join(TMP_DIR, PRERENDERED_PAGES_FOLDER), {
      handler: ({ cache, setComment }) => {
        cache(PUBLIC_CACHE_CONFIG)
        setComment('Serve pre-rendered HTML pages')
      },
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
}
