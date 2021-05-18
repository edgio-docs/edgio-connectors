// This file was automatically added by xdn deploy.
// You should commit this file to source control.
const { Router } = require('@xdn/core/router')
const { sapperRoutes } = require('@xdn/sapper')

const cacheHandler = ({ removeUpstreamResponseHeader, cache }) => {
  removeUpstreamResponseHeader('cache-control')
  cache({
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

module.exports = new Router()
  .match('/blog.json', cacheHandler)
  .match('/:path*/:file.json', cacheHandler)
  .use(sapperRoutes) // automatically adds routes for all files under /pages
