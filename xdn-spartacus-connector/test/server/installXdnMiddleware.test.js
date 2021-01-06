import getNamespace from '../../src/server/getNamespace'
import installXdnMiddleware from '../../src/server/installXdnMiddleware'
import { Express, http as baseHttp, https as baseHttps } from '../mocks'

describe('installXdnMiddleware', () => {
  let http, https, server, ns, requestValues

  beforeAll(() => {
    ns = getNamespace()
    requestValues = {}
    Object.defineProperty(ns, 'set', {
      value: (key, value) => {
        requestValues[key] = value
      },
    })
    Object.defineProperty(ns, 'get', {
      value: key => {
        return requestValues[key]
      },
    })
  })

  beforeEach(() => {
    http = baseHttp
    https = baseHttps
    server = new Express()
    requestValues = {}
  })

  it('should install the middleware onto a given server', () => {
    installXdnMiddleware({ server })
    expect(server.requestCallback).toBeDefined()
  })

  it('should patch the http and https modules', () => {
    const origHttpRequest = http.request
    const origHttpsRequest = https.request
    installXdnMiddleware({ server, http, https })
    server.request()
    expect(origHttpRequest).not.toEqual(http.request)
    expect(origHttpsRequest).not.toEqual(https.request)
  })

  it('should ignore patching http or https if not included', () => {
    const origHttpRequest = http.request
    const origHttpsRequest = https.request
    installXdnMiddleware({ server })
    server.request()
    expect(origHttpRequest).toEqual(http.request)
    expect(origHttpsRequest).toEqual(https.request)
  })

  it('should add the string request paths values to the namespace', () => {
    installXdnMiddleware({ server, http, https })
    server.request()
    http.request('/test')
    expect([...ns.get('requests')]).toEqual(['/test'])
  })

  it('should add the URL request paths values to the namespace', () => {
    installXdnMiddleware({ server, http, https })
    server.request()
    http.request({ path: '/test' })
    expect([...ns.get('requests')]).toEqual(['/test'])
  })

  it('should do nothing if no request path is passed', () => {
    installXdnMiddleware({ server, http, https })
    server.request()
    http.request()
    expect([...ns.get('requests').values()]).toEqual([])
  })
})
