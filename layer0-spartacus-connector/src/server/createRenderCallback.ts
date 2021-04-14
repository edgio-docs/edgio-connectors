import { Response } from 'express-serve-static-core'
import { BACKEND_REQUESTS_RESPONSE_HEADER_NAME } from '@layer0/prefetch/constants'
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
export default function createRenderCallback(res: Response) {
  const callback = (err: Error, html: string) => {
    const requestsArray = [...(ns.get('requests') || [])]
    let header = ''
    requestsArray.forEach(request => {
      header += request + ';'
    })
    res.set(BACKEND_REQUESTS_RESPONSE_HEADER_NAME, header)

    res.send(html)
  }
  return ns.bind(callback)
}
