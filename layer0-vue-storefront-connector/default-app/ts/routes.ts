// This file was added by layer0 init.
// You should commit this file to source control.

import { Router, ResponseWriter } from '@layer0/core/router'
import { CacheOptions } from '@layer0/core/router/CacheOptions'
import { nuxtRoutes, renderNuxtPage } from '@layer0/nuxt'
import { decompressRequest } from '@layer0/apollo'

const HTML: CacheOptions = {
  edge: {
    maxAgeSeconds: 60 * 60 * 24,
    staleWhileRevalidateSeconds: 60 * 60 * 24,
    forcePrivateCaching: true,
  },
  browser: false,
}

function cacheHTML({ cache, removeUpstreamResponseHeader }: ResponseWriter) {
  removeUpstreamResponseHeader('set-cookie')
  cache(HTML)
}

export default new Router()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .get('/', cacheHTML)
  .get('/c/:slug*', cacheHTML)
  .get('/p/:slug*', cacheHTML)
  // @ts-ignore
  .post('/:env/graphql', ({ proxy }) => {
    proxy('api')
  })
  .get(
    {
      path: '/:env/graphql',
    },
    // @ts-ignore
    ({ proxy, cache, removeUpstreamResponseHeader }) => {
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
    }
  )
  .use(nuxtRoutes)
  .fallback(renderNuxtPage)
