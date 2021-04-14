describe('StarterRoutes', () => {
  let StarterRoutes,
    Router,
    router,
    request,
    response,
    responseHeaders = {},
    cache,
    serveStatic,
    proxy,
    serviceWorker

  beforeEach(() => {
    jest.isolateModules(() => {
      jest.resetModules()
      jest.spyOn(console, 'log').mockImplementation()
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      serviceWorker = jest.fn()

      jest.doMock('@layer0/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.cache = cache
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.proxy = proxy
            this.serviceWorker = serviceWorker
          }
        }
      })

      Router = require('@layer0/core/router/Router').default
      router = new Router()

      request = {
        url: '/',
        method: 'get',
        headers: {
          host: 'domain.com',
        },
        on: (event, cb) => {
          if (event === 'data') {
            setImmediate(() => cb(request.body))
          } else if (event === 'end') {
            setImmediate(cb)
          }
        },
      }

      response = {
        writeHead: jest.fn(),
        end: jest.fn(),
        setHeader: jest.fn((header, value) => {
          responseHeaders[header] = value
        }),
        getHeaders: jest.fn(() => []),
      }

      StarterRoutes = require('../src/StarterRoutes').default
    })
  })

  it('should add a route for the service worker', async () => {
    router.use(new StarterRoutes())
    request.path = '/service-worker.js'
    await router.run(request, response)
    expect(serviceWorker).toHaveBeenCalledWith('dist/service-worker.js')
  })

  it('should add a route for main.js', async () => {
    router.use(new StarterRoutes())
    request.path = '/__layer0__/abc123/browser.js'
    await router.run(request, response)
    expect(serveStatic).toHaveBeenCalledWith('dist/browser.js')
  })
})
