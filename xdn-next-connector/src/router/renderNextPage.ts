import qs from 'qs'
import addPreloadHeaders from '@xdn/core/router/addPreloadHeaders'
import { BACKENDS } from '@xdn/core/constants'
import ResponseWriter from '@xdn/core/router/ResponseWriter'
import Request from '@xdn/core/router/Request'
import Params from './Params'

/**
 * Creates a function that proxies a request to next.js.
 *
 *  new Router()
 *    .get('/some-vanity-url/:withVar', res => {
 *      res.cache({
 *        edge: {
 *          maxAgeSeconds: 60 * 60 // 1 hour
 *        }
 *      })
 *      return renderNextPage('/p/[productId]', res, (params, request) => ({ productId: params.withVar }))
 *    })
 *
 * @param {String} page The next page route - for example /p/[productId]
 * @param {ResponseWriter} responseWriter The response writer passed into your route handler
 * @param {Object|Function|undefined} params An optional object containing query params to provide to the next page, or a function that takes the route's path params and the request and returns a params object.
 * @return Promise A promise that resolves when the response has been received from Next.js
 */
export default async function renderNextPage(
  page: string,
  responseWriter: ResponseWriter,
  params?: Params | ((p: Params, request: Request) => Params)
) {
  const { request, proxy, updateUpstreamResponseHeader } = responseWriter

  await proxy(BACKENDS.js, {
    headers: {
      'x-next-page': page,
    },
    path: () => {
      // will get here when generating the cache manifest for prefetching
      let { url, query } = request
      let path = url.split(/\?/)[0]

      // params can be an object or a function
      if (typeof params === 'function') {
        params = params(<Params>request.params, request)
      } else {
        if (!params) {
          params = request.params
        }
      }

      // here we override params on the incoming request with params specified by the developer
      // so that the developer can be sure that things like productId which they specify take precedence
      query = { ...query, ...params }

      let search = qs.stringify(query)

      if (search.length) {
        search = `?${search}`
      }

      return `${path}${search}`
    },
    transformResponse: addPreloadHeaders,
  })

  // getServerSideProps adds cache-control: private by default, which prevents caching in the XDN.
  // If the user wants the responses to be truly private, they will need to add `cache({ browser: false })`
  // to their routes.
  updateUpstreamResponseHeader('cache-control', /(,\s*\bprivate\b\s*)|(^\s*private,\s*)/g, '')
}
