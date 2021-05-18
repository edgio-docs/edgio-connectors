import { EventEmitter } from 'events'
import { Express } from 'express-serve-static-core'
import getNamespace from './getNamespace'

const ns = getNamespace()

/**
 * Installs middleware to the given server to modify requests to http and https
 * to store a list of other requests made during SSR in a header, to be used
 * later when prefetching.
 * @param {Express} server The express server to modify
 * @param {Http} http The 'http' module used in the express server
 * @param {Https} https The 'https' module used in the express server
 */
const installXdnMiddleware = ({
  server,
  http,
  https,
}: {
  server: Express
  http?: any
  https?: any
}) => {
  const originalHttpRequest = http?.request
  const originalHttpsRequest = https?.request

  const patchHttpModule = (module: any, orig: any) => {
    // @ts-ignore
    module.request = ns.bind(function(...args) {
      const requestsSet = ns.get('requests')
      if (requestsSet && args[0]) {
        let path
        const options = args[0]
        if (typeof options === 'string') {
          path = options
        } else {
          path = options.path
        }
        const newSet = requestsSet.add(path)
        ns.set('requests', newSet)
      }
      return orig(...args)
    })
  }

  const patchHttp = () => {
    if (http) patchHttpModule(http, originalHttpRequest)
    if (https) patchHttpModule(https, originalHttpsRequest)
  }

  const middleware = (req: EventEmitter, res: EventEmitter, next: Function) => {
    ns.bindEmitter(req)
    ns.bindEmitter(res)
    ns.run(() => {
      patchHttp()
      const requests = new Set()
      ns.set('requests', requests)
      next()
    })
  }
  server.use(middleware)
}

export default installXdnMiddleware
