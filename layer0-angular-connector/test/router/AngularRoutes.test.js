import path, { join } from 'path'
import { LAYER0_ENV_VARIABLES } from '@layer0/core/constants'

describe('AngularRoutes', () => {
  let AngularRoutes,
    Router,
    router,
    plugin,
    request,
    response,
    responseHeaders = {},
    cache,
    serviceWorker,
    serveStatic,
    proxy,
    render

  beforeEach(() => {
    jest.isolateModules(() => {
      cache = jest.fn()
      serviceWorker = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      render = jest.fn()

      process.chdir(join(__dirname, '..', 'app'))

      jest.doMock('@layer0/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.cache = cache
            this.serviceWorker = serviceWorker
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.render = render
            this.proxy = proxy
          }
        }
      })

      Router = require('@layer0/core/router/Router').default
      AngularRoutes = require('../../src/router/AngularRoutes').default
      plugin = new AngularRoutes()
      router = new Router().use(plugin)
      router.setBackend('__js__', { domainOrIp: 'js.backend' })

      request = {
        url: '/',
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
      }
    })
  })

  afterAll(() => {
    delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
  })

  describe('in local development', () => {
    it('should add routes for all static assets', async () => {
      request.path = '/static_asset.txt'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith(
        'dist/my-layer0-angular-app/browser/static_asset.txt'
      )
    })

    it('should proxy any non static asset request to JS backend', async () => {
      request.path = '/anything_else'
      await router.run(request, response)
      expect(cache).not.toHaveBeenCalled()
      expect(proxy).toHaveBeenCalledWith('__js__')
    })
  })

  describe('in the cloud', () => {
    beforeAll(() => {
      jest.doMock(
        path.join(process.cwd(), '..', 'static-asset-manifest.json'),
        () => [{ file: 'static_asset.txt', path: '/static_asset.txt' }],
        { virtual: true }
      )
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
    })

    it('should add a route for the service worker', async () => {
      request.path = '/service-worker.js'
      await router.run(request, response)
      expect(serviceWorker).toHaveBeenCalledWith('dist/__layer0__/service-worker.js')
    })

    it('should add routes for all static assets', async () => {
      request.path = '/assets/static_asset.txt'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('dist/my-layer0-angular-app/browser/assets/:path')
    })

    it('should add routes for all static chunks', async () => {
      request.path = '/chunk.js'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('dist/my-layer0-angular-app/browser/chunk.js')
    })
  })
})
