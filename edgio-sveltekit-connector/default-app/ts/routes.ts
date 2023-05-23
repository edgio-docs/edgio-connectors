// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { Router } from '@edgio/core/router'
import { svelteKitRoutes } from '@edgio/sveltekit'

const CACHE_FEATURE = {
  caching: {
    max_age: '24h',
    bypass_client_cache: true,
    service_worker_max_age: '24h',
  },
  headers: {
    remove_origin_response_headers: ['cache-control'],
  },
}

export default new Router()
  // automatically adds routes for all files
  .use(svelteKitRoutes)
  // add routes for specific assets to configure caching
  .match('/:path*/:file.json', CACHE_FEATURE)
