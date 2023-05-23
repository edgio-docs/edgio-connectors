// This file was added by edgio init.
// You should commit this file to source control.
import { Router } from '@edgio/core'
import { nuxtRoutes } from '@edgio/nuxt'
import { decompressRequest } from '@edgio/apollo'

const CACHE_HTML_FEATURE = {
  headers: {
    remove_origin_response_headers: ['set-cookie'],
  },
  caching: {
    max_age: '24h',
    stale_while_revalidate: '24h',
    bypass_client_cache: true,
  },
}

export default new Router()
  .use(nuxtRoutes)
  .get('/', CACHE_HTML_FEATURE)
  .get('/c/:slug*', CACHE_HTML_FEATURE)
  .get('/p/:slug*', CACHE_HTML_FEATURE)
  .post('/:env/graphql', ({ proxy }) => proxy('api'))
  .get("'/:env/graphql'", ({ proxy, cache, removeUpstreamResponseHeader }) => {
    cache({
      edge: {
        maxAgeSeconds: 60 * 60 * 24 * 365,
      },
      browser: {
        serviceWorkerSeconds: 60 * 60 * 24 * 365,
      },
    })
    proxy('api', {
      transformRequest: decompressRequest,
    })
    removeUpstreamResponseHeader('cache-control')
  })
