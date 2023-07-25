// This file was automatically added by edgio init.
// You should commit this file to source control.
import { Router } from '@edgio/core'
import { angularRoutes } from '@edgio/angular'

const CACHE_API_FEATURE = {
  caching: {
    max_age: '24h',
    stale_while_revalidate: '24h',
    client_max_age: '24h',
    service_worker_max_age: '24h',
  },
}

const CACHE_ASSETS_FEATURE = {
  caching: {
    max_age: '1y',
    stale_while_revalidate: '24h',
    client_max_age: '24h',
  },
}

const CACHE_SSR_PAGE_FEATURE = {
  caching: {
    max_age: '1y',
    stale_while_revalidate: '1y',
  },
}

export default new Router()
  .use(angularRoutes)
  .match('/rest/v2/:path*', {
    ...CACHE_API_FEATURE,
    origin: {
      set_origin: 'commerce',
    },
  })
  .match('/medias/:path*', {
    ...CACHE_ASSETS_FEATURE,
    origin: {
      set_origin: 'commerce',
    },
  })
  .post('/authorizationserver/oauth/:path*', {
    origin: {
      set_origin: 'commerce',
    },
  })
  .get('/products/:path*', CACHE_SSR_PAGE_FEATURE)
