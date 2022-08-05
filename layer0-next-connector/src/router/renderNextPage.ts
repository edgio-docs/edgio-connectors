import addPreloadHeaders from '@layer0/core/router/addPreloadHeaders'
import { BACKENDS } from '@layer0/core/constants'
import ResponseWriter from '@layer0/core/router/ResponseWriter'
import Request from '@layer0/core/router/Request'
import Params from './Params'
import { toRouteSyntax } from './nextPathFormatter'
import qs from 'qs'
import bindParamsToPath from '@layer0/core/utils/bindParamsToPath'
import { isProductionBuild } from '@layer0/core/environment'
import { getServerBuildAvailability } from '../util/getServerBuildAvailability'
import getNextConfig from '../getNextConfig'

// The named export is user-facing while the default export is used internally.
// When Next 12 users that have opted into `server` target use this function they
// get a deprecation message once.
export function renderNextPage(
  page: string,
  responseWriter: ResponseWriter,
  params?: Params | ((p: Params, request: Request) => Params),
  options: RenderOptions = { rewritePath: true }
) {
  if (!isProductionBuild()) {
    const config = getNextConfig()
    const { useServerBuild } = getServerBuildAvailability({ config })

    if (useServerBuild) {
      throw new Error(
        'The use of `renderNextPage` is retired for use with a server target build. Use `renderWithApp()` instead.\n' +
          'More information: https://docs.layer0.co/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
      )
    }
  }

  return _renderNextPage(page, responseWriter, params, options)
}

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
 * @param page The next page route - for example /p/[productId]
 * @param responseWriter The response writer passed into your route handler
 * @param params An optional object containing query params to provide to the next page, or a function that takes the route's path params and the request and returns a params object.
 * @param options
 * @return Promise A promise that resolves when the response has been received from Next.js
 */
export default async function _renderNextPage(
  page: string,
  responseWriter: ResponseWriter,
  params?: Params | ((p: Params, request: Request) => Params),
  /* istanbul ignore next */
  options: RenderOptions = { rewritePath: true }
) {
  const { request, proxy, updateUpstreamResponseHeader } = responseWriter

  await proxy(BACKENDS.js, {
    headers: {
      'x-next-page': page,
    },
    path: () => {
      // will get here when generating the cache manifest for prefetching
      let { query } = request

      // params can be an object or a function
      if (typeof params === 'function') {
        params = params(<Params>request.params, request)
      } else if (!params) {
        params = request.params
      }

      // here we override params on the incoming request with params specified by the developer
      // so that the developer can be sure that things like productId which they specify take precedence
      query = { ...query, ...params }

      let search = qs.stringify(query)

      if (search.length) {
        search = `?${search}`
      }

      const path = options.rewritePath ? rewritePath(request, page, params) : request.path

      return `${path}${search}`
    },
    transformResponse: addPreloadHeaders,
  })

  // getServerSideProps adds cache-control: private by default, which prevents caching in Layer0.
  // If the user wants the responses to be truly private, they will need to add `cache({ browser: false })`
  // to their routes.
  updateUpstreamResponseHeader('cache-control', /(,\s*\bprivate\b\s*)|(^\s*private,\s*)/g, '')
}

/**
 * Rewrites the request path so that users can use renderNextPage to render a response
 * body using a page that doesn't match the request path.
 * @param request
 * @param page
 * @param params
 */
function rewritePath(request: Request, page: string, params: any) {
  let destinationRoute = toRouteSyntax(page)

  if (request.path && request.path.startsWith('/_next/data/')) {
    destinationRoute = `/_next/data/:__build__/${destinationRoute.replace(/^\//, '')}.json`
  }

  return bindParamsToPath(destinationRoute, params)
}

export interface RenderOptions {
  /**
   * Set to false to skip path rewriting. Use this only when Layer0 route matches the next.js route.
   * This slightly reduces the amount of work that needs to be done on every request.
   */
  rewritePath: boolean
}
