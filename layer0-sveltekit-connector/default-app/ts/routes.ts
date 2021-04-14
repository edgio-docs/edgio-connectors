// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { ResponseWriter, Router } from '@layer0/core/router'
import { svelteKitRoutes } from '@layer0/sveltekit'

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
  // add routes for specific assets to configure caching
  .match('/:path*/:file.json', cacheHandler)
  // automatically adds routes for all files under /pages
  .use(svelteKitRoutes)
