/* istanbul ignore file */
import dotenv from 'dotenv-defaults'
import { createServer } from 'http'
// @ts-ignore
import toLambdaEvent from '@edgio/cli/serverless/toLambdaEvent'
import { resolve } from 'path'

dotenv.config()

export default async function prod(port: number) {
  createServer(async (request: any, response: any) => {
    try {
      const event = await toLambdaEvent(request)

      // determine which handler to invoke based on the request path
      const handlerName = event.path.split('/').reverse()[0]

      // @ts-ignore
      const { handler } = nonWebpackRequire(resolve(`./api/dist/functions/${handlerName}`))

      // `handler(event, context)` takes an event comprised of the http request and lambda
      // event properties.
      const res = await handler({ ...request, ...event }, {})

      const { body, statusCode, statusMessage, multiValueHeaders, headers } = res
      const resHeaders = { ...headers, ...multiValueHeaders }

      for (let name in resHeaders) {
        const value = resHeaders[name]
        // Node will handle arrays correctly (multiple values means multiple headers,
        // single value means single header) so we leave them unconverted.
        response.setHeader(name, value)
      }
      response.writeHead(statusCode, statusMessage)
      response.end(body)
    } catch (e) {
      console.error(e)
      // We are emulating the XBP behavior on uncaught exceptions within user project code.
      response.writeHead(534, 'Project Unexpected Error')
    }
  }).listen(port)
}
