import { Response } from 'express-serve-static-core'
import { BACKEND_REQUESTS_RESPONSE_HEADER_NAME } from '@edgio/prefetch/constants'
import getNamespace from './getNamespace'

const ns = getNamespace()

/**
 * Creates a callback function to be passed to the res.render() function inside
 * of the server.get('*') callback.
 *
 * e.g.
 * server.get('*', (req, res) => {
 *   res.render(
 *     indexHtml,
 *     { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] },
 *     createRenderCallback(res),
 *   );
 * });
 *
 */
export default function createRenderCallback(
  res: Response,
  { maxHeaderLength }: RenderCallbackOptions = {}
) {
  const callback = (err: Error, html: string) => {
    const requestsArray = [...(ns.get('requests') || [])]
    let header = ''
    requestsArray.forEach(request => {
      if (maxHeaderLength == null || header.length + request.length <= maxHeaderLength) {
        header += request + ';'
      }
    })
    res.set(BACKEND_REQUESTS_RESPONSE_HEADER_NAME, header)

    res.send(html)
  }
  return ns.bind(callback)
}

export interface RenderCallbackOptions {
  /**
   * Limits the maximum length of the x-0-upstream-requests response header,
   * which can be quite long if your application makes many upstream fetches during
   * SSR.
   */
  maxHeaderLength?: number
}
