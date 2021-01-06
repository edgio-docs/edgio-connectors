import { XDN_ENV_VARIABLES } from '@xdn/core/constants'
import { BACKENDS } from '@xdn/core/constants'
import fs from 'fs'
import { join } from 'path'
import { STATIC_ASSET_MANIFEST_FILE } from '@xdn/core/router/RouteGroup'

describe('SapperRoutes', () => {
  let SapperRoutes,
    Router,
    router,
    request,
    response,
    responseHeaders = {},
    cache,
    serveStatic,
    proxy,
    stream,
    setRequestHeader,
    watchCallback,
    watch,
    serviceWorker

  beforeEach(() => {
    jest.isolateModules(() => {
      jest.resetModules()
      jest.spyOn(console, 'log').mockImplementation()
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()
      serviceWorker = jest.fn()

      watch = jest.spyOn(fs, 'watch').mockImplementation((file, options, callback) => {
        watchCallback = callback
      })

      const glob = require(join(require.resolve('@xdn/core'), '..', '..', 'node_modules', 'globby'))

      jest.spyOn(glob, 'sync').mockImplementation((pattern, options) => {
        if (options.cwd && options.cwd.match(/src\/routes$/)) {
          if (options.ignore && options.ignore[0] === '**/_*') {
            return ['p/[id].svelte', 'foo.txt']
          } else {
            return ['_layout.svelte', 'p/[id].svelte', 'foo.txt']
          }
        } else if (options.cwd && options.cwd.match(/static$/)) {
          return ['favicon.ico']
        } else {
          return []
        }
      })

      jest.doMock(
        join(process.cwd(), STATIC_ASSET_MANIFEST_FILE),
        () => {
          return { static: [], 'src/routes': [] }
        },
        { virtual: true }
      )

      jest.doMock('@xdn/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.cache = cache
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.proxy = proxy
            this.render = cb => cb(request, response, {})
            this.stream = stream
            this.setRequestHeader = setRequestHeader
            this.serviceWorker = serviceWorker
          }
        }
      })

      Router = require('@xdn/core/router/Router').default
      router = new Router()
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
        getHeaders: jest.fn(() => []),
      }

      SapperRoutes = require('../../src/router/SapperRoutes').default
    })
  })

  afterEach(() => {
    watchCallback = undefined
  })

  describe('#constructor', () => {
    it('should watch src/routes for changes', () => {
      const updateRoutes = jest.spyOn(SapperRoutes.prototype, 'updateRoutes')
      router.use(new SapperRoutes())

      expect(watch).toHaveBeenCalledWith(
        join(process.cwd(), join('src', 'routes')),
        { recursive: true },
        expect.any(Function)
      )

      watchCallback()
      expect(updateRoutes).toHaveBeenCalled()
    })
  })

  describe('in local development', () => {
    it('should add routes for all static assets', async () => {
      router.use(new SapperRoutes())
      request.path = '/client/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should not fail if the router is missing', async () => {
      router.use(new SapperRoutes())
      request.path = '/client/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should far future cache in production mode', async () => {
      const env = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        router.use(new SapperRoutes())
        request.path = '/client/index.js'
        await router.run(request, response)
        expect(cache.mock.calls[0][0].browser.maxAgeSeconds > 0).toBe(true)
      } finally {
        process.env.NODE_ENV = env
      }
    })

    it('should add routes for all assets in the static dir', async () => {
      router.use(new SapperRoutes())
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('static/favicon.ico')
    })

    it('should stream /__sapper__', async () => {
      router.use(new SapperRoutes())
      request.path = '/__sapper__'
      await router.run(request, response)
      expect(stream).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add routes for all pages', async () => {
      router.use(new SapperRoutes())
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add a route for the service worker', async () => {
      router.use(new SapperRoutes())
      request.path = '/service-worker.js'
      await router.run(request, response)
      expect(serviceWorker).toHaveBeenCalledWith('__sapper__/dev/service-worker.js')
    })

    it('should exclude routes that start with _', async () => {
      router.use(new SapperRoutes())
      request.path = '/_layout'
      await router.run(request, response)
      expect(proxy).not.toHaveBeenCalled()
    })
  })

  describe('in the cloud', () => {
    const env = process.env.NODE_ENV

    beforeAll(() => {
      process.env[XDN_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
    })

    afterAll(() => {
      delete process.env[XDN_ENV_VARIABLES.deploymentType]
      process.env.NODE_ENV = env
    })

    it('should add routes for browser assets', async () => {
      router.use(new SapperRoutes())
      request.path = '/client/index.js'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('__sapper__/build/client/:path*')
    })

    it('should add a route for the service worker', async () => {
      router.use(new SapperRoutes())
      request.path = '/service-worker.js'
      await router.run(request, response)
      expect(serviceWorker).toHaveBeenCalledWith('__sapper__/build/service-worker.js')
    })
  })

  describe('is', () => {
    it('should return true when the specified plugin is an instance of SapperRoutes', () => {
      expect(SapperRoutes.is(new SapperRoutes())).toBe(true)
    })
    it('should return false when the specified plugin is an instance of SapperRoutes', () => {
      expect(SapperRoutes.is({})).toBe(false)
    })
  })
})
