import { LAYER0_ENV_VARIABLES } from '@layer0/core/constants'
import { BACKENDS } from '@layer0/core/constants'
import { join } from 'path'
import { STATIC_ASSET_MANIFEST_FILE } from '@layer0/core/router/RouteGroup'
import * as coreWatch from '@layer0/core/utils/watch'

describe('SvelteKitRoutes', () => {
  let SvelteKitRoutes,
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
      jest.spyOn(console, 'log').mockImplementation()
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()
      serviceWorker = jest.fn()

      watch = jest.spyOn(coreWatch, 'default').mockImplementation(() => {
        return {
          on: (_filter, cb) => {
            watchCallback = cb
          },
        }
      })

      const glob = require(join(
        require.resolve('@layer0/core'),
        '..',
        '..',
        'node_modules',
        'globby'
      ))

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
            this.serviceWorker = serviceWorker
          }
        }
      })

      Router = require('@layer0/core/router/Router').default
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

      SvelteKitRoutes = require('../../src/router/SvelteKitRoutes').default
    })
  })

  afterEach(() => {
    watchCallback = undefined
  })

  describe('#constructor', () => {
    it('should watch src/routes for changes', () => {
      const updateRoutes = jest.spyOn(SvelteKitRoutes.prototype, 'updateRoutes')
      router.use(new SvelteKitRoutes())

      expect(watch).toHaveBeenCalledWith(join(process.cwd(), join('src', 'routes')))

      watchCallback()
      expect(updateRoutes).toHaveBeenCalled()
    })
  })

  describe('in local development', () => {
    it('should add routes for all static assets', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/_app/pages/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should not fail if the router is missing', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/_app/pages/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should far future cache in production mode', async () => {
      const env = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        router.use(new SvelteKitRoutes())
        request.path = '/_app/pages/index.js'
        await router.run(request, response)
        expect(cache.mock.calls[0][0].browser.maxAgeSeconds > 0).toBe(true)
      } finally {
        process.env.NODE_ENV = env
      }
    })

    it('should add routes for all assets in the static dir', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('static/favicon.ico')
    })

    it('should stream /_app', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/_app'
      await router.run(request, response)
      expect(stream).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add routes for all pages', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should exclude routes that start with _', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/_layout'
      await router.run(request, response)
      expect(proxy).not.toHaveBeenCalled()
    })

    it('should stream dev requests', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/.svelte-kit/hello'
      await router.run(request, response)
      request.path = '/src/lib/icon.svg'
      await router.run(request, response)
      request.path = '/node_modules/module.js'
      await router.run(request, response)
      request.path = '/@vite/client'
      await router.run(request, response)
      expect(stream).toHaveBeenCalledWith(BACKENDS.js)
      expect(stream).toHaveBeenCalledTimes(4)
    })
  })

  describe('in the cloud', () => {
    const env = process.env.NODE_ENV

    beforeAll(() => {
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
    })

    afterAll(() => {
      delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
      process.env.NODE_ENV = env
    })

    it('should add routes for browser assets', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/_app/pages/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.permanentStatic)
    })

    it('should add a route for the service worker', async () => {
      router.use(new SvelteKitRoutes())
      request.path = '/service-worker.js'
      await router.run(request, response)
      expect(serviceWorker).toHaveBeenCalledWith('.svelte-kit/output/client/service-worker.js')
    })
  })

  describe('is', () => {
    it('should return true when the specified plugin is an instance of SvelteKitRoutes', () => {
      expect(SvelteKitRoutes.is(new SvelteKitRoutes())).toBe(true)
    })
    it('should return false when the specified plugin is an instance of SvelteKitRoutes', () => {
      expect(SvelteKitRoutes.is({})).toBe(false)
    })
  })
})
