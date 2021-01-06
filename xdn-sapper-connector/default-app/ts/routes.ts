// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { ResponseWriter, Router } from '@xdn/core/router'
import { sapperRoutes } from '@xdn/sapper'

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
  .match('/blog.json', cacheHandler)
  .match('/:path*/:file.json', cacheHandler)
  .use(sapperRoutes) // automatically adds routes for all files under /pages
