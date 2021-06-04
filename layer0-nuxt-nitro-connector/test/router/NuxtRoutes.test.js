import { BACKENDS } from '@layer0/core/constants'
import path, { join } from 'path'
import { mockRequest, mockResponse } from './mocks'

describe('NuxtRoutes', () => {
  let NuxtRoutes,
    Router,
    router,
    request,
    response,
    responseHeaders = {},
    cache,
    serveStatic,
    proxy,
    renderWithApp,
    stream,
    setRequestHeader,
    serviceWorker,
    env = process.env.NODE_ENV,
    cwd = process.cwd()

  beforeEach(() => {
    jest.isolateModules(() => {
      process.chdir(join(__dirname, '..', 'apps', 'test'))

      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()
      renderWithApp = jest.fn()
      serviceWorker = jest.fn()

      jest.doMock('@layer0/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.cache = cache
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.proxy = proxy
            this.render = cb => cb(request, response, {})
            this.stream = stream
            this.setRequestHeader = setRequestHeader
            this.renderWithApp = renderWithApp
            this.serviceWorker = serviceWorker
          }
        }
      })

      jest.doMock(
        path.join(process.cwd(), 'static-asset-manifest.json'),
        () => ({
          static: ['favicon.ico'],
        }),
        { virtual: true }
      )

      Router = require('@layer0/core/router/Router').default
      router = new Router()
      router.setBackend('__js__', { domainOrIp: 'js.backend' })
      request = mockRequest()
      response = mockResponse(responseHeaders)
      NuxtRoutes = require('../../src/router/NuxtRoutes').default
    })
  })

  afterEach(() => {
    process.env.NODE_ENV = env
    process.chdir(cwd)
  })

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should fallback to dynamic 404', async () => {
      request.path = '/not-found'
      await new Router().use(new NuxtRoutes()).run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })

    it('should serve static assets before dynamic pages', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.output/public/_nuxt/:path*', {
        exclude: ['service-worker.js', 'LICENSES'],
        permanent: true,
      })
    })

    it('should far future cache in production mode', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(cache.mock.calls[0][0].browser).toEqual({ maxAgeSeconds: 315360000 })
    })

    it('should add routes for all static assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.output/public/_nuxt/:path*', {
        exclude: ['service-worker.js', 'LICENSES'],
        permanent: true,
      })
    })

    it('should add routes for all public assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.output/public/favicon.ico')
    })

    it('should add a route for the service worker', async () => {
      router.use(new NuxtRoutes())
      request.path = '/service-worker.js'
      await router.run(request, response)
      expect(serviceWorker).toHaveBeenCalledWith('.nuxt/dist/service-worker.js')
    })
  })

  describe('in local development', () => {
    it('should add routes for all static assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
      expect(cache.mock.calls[0][0].browser).toBe(false)
    })

    it('should add routes for all public assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('static/favicon.ico')
    })

    it('should stream /__webpack_hmr/*path', async () => {
      router.use(new NuxtRoutes())
      request.path = '/__webpack_hmr/643563456.js'
      await router.run(request, response)
      expect(stream).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should stream /_nuxt/:hash.hot-update.json', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/643563456.hot-update.json'
      await router.run(request, response)
      expect(stream).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add a fallback to Nuxt', async () => {
      router.use(new NuxtRoutes())
      request.path = '/not-found-page'
      await router.run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })
  })
})
