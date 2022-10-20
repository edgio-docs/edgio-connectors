import addPreloadHeaders from '@edgio/core/router/addPreloadHeaders'
import { BACKENDS } from '@edgio/core/constants'
import { ResponseWriter } from '@edgio/core/router'

/**
 * Creates a function that proxies a request to next.js.
 *
 *  new Router()
 *    .get('/products/:id', res => {
 *      res.cache({
 *        edge: {
 *          maxAgeSeconds: 60 * 60 // 1 hour
 *        }
 *      })
 *      return renderNuxtPage(res)
 *    })
 *
 * @param res The response writer passed into your route handler
 * @return Promise A promise that resolves when the response has been received from Next.js
 */
export default function renderNuxtPage(res: ResponseWriter) {
  return res.proxy(BACKENDS.js, {
    transformResponse: addPreloadHeaders,
  })
}
