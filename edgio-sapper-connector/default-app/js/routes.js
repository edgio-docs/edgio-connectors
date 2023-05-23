// This file was automatically added by edgio deploy.
// You should commit this file to source control.
const { Router } = require('@edgio/core')
const { sapperRoutes } = require('@edgio/sapper')

const cacheHandler = {
  caching: {
    max_age: '24h',
    bypass_client_cache: true,
    service_worker_max_age: '24h',
  },
  headers: {
    remove_origin_response_headers: ['cache-control'],
  },
}

module.exports = new Router()
  .use(sapperRoutes) // automatically adds routes for all files
  .match('/blog.json', cacheHandler)
  .match('/:path*/:file.json', cacheHandler)
