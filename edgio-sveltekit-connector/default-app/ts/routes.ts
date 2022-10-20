// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { ResponseWriter, Router } from '@edgio/core/router'
import { svelteKitRoutes } from '@edgio/sveltekit'

const cacheHandler = (res: ResponseWriter) => {
  res.removeUpstreamResponseHeader('cache-control')
  res.cache({
    edge: {
      maxAgeSeconds: 60 * 60 * 24,
      staleWhileRevalidateSeconds: 60 * 60 * 24,
    },
    browser: {
      maxAgeSeconds: 0,
      serviceWorkerSeconds: 60 * 60 * 24,
    },
  })
}

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  // add routes for specific assets to configure caching
  .match('/:path*/:file.json', cacheHandler)
  // automatically adds routes for all files under /pages
  .use(svelteKitRoutes)
