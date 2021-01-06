// This file was added by xdn init.
// You should commit this file to source control.

const { Router } = require('@xdn/core/router')
const { nuxtRoutes, renderNuxtPage } = require('@xdn/nuxt')
const { decompressRequest } = require('@xdn/apollo')

const HTML = {
  edge: {
    maxAgeSeconds: 60 * 60 * 24,
    staleWhileRevalidateSeconds: 60 * 60 * 24,
    forcePrivateCaching: true,
  },
  browser: false,
}

const cacheHTML = ({ cache, removeUpstreamResponseHeader }) => {
  removeUpstreamResponseHeader('set-cookie')
  cache(HTML)
}

module.exports = new Router()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .get('/', cacheHTML)
  .get('/c/:slug*', cacheHTML)
  .get('/p/:slug*', cacheHTML)
  .post('/:env/graphql', ({ proxy }) => {
    proxy('api')
  })
  .get(
    {
      path: '/:env/graphql',
    },
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
