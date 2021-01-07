import { XDN_ENV_VARIABLES } from '@xdn/core/constants'
import { BACKENDS } from '@xdn/core/constants'
import fs from 'fs'
import path from 'path'

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
    stream,
    setRequestHeader,
    watchCallback,
    routes = []

  const originalReadFileSync = fs.readFileSync

  beforeEach(() => {
    jest.isolateModules(() => {
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()

      jest.spyOn(fs, 'watch').mockImplementation((file, callback) => {
        watchCallback = callback
      })

      jest.spyOn(fs, 'readFileSync').mockImplementation((file, ...others) => {
        if (file.endsWith('routes.json')) {
          return routes ? JSON.stringify(routes) : ''
        } else {
          return originalReadFileSync(file, ...others)
        }
      })

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

      Router = require('@xdn/core/router/Router').default
      router = new Router()
      router.setBackend('__js__', { domainOrIp: 'js.backend' })

      const glob = require(path.join(
        require.resolve('@xdn/core'),
        '..',
        '..',
        'node_modules',
        'globby'
      ))

      jest.spyOn(glob, 'sync').mockImplementation((pattern, options) => {
        if (options.cwd && options.cwd.match(/static$/)) {
          return ['favicon.ico']
        } else {
          return []
        }
      })

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

      NuxtRoutes = require('../../../src/router/NuxtRoutes').default
    })
  })

  afterEach(() => {
    watchCallback = undefined
    routes = []
  })

  describe('#constructor', () => {
    it('should watch the routes file in development', () => {
      routes = [{ path: '/p/:id?' }]
      router.use(new NuxtRoutes())
      const group = router.routeGroups.findByName('nuxt_routes_group')
      expect(group.routes.length).toBe(4)
      watchCallback('change')
      expect(group.routes.map(route => route.criteria.path)).toContain('/p/:id')
    })

    it('should accept watch events other than change', () => {
      router.use(new NuxtRoutes())
      routes = [{ path: '/p/:id?' }]
      const group = router.routeGroups.findByName('nuxt_routes_group')
      watchCallback('delete')
      expect(group.routes.length).toBe(4)
    })

    it('should accept an empty routes file', () => {
      router.use(new NuxtRoutes())
      routes = null
      const group = router.routeGroups.findByName('nuxt_routes_group')
      watchCallback('change')
      expect(group.routes.length).toBe(4)
    })

    it('should not watch the routes file in development', () => {
      const env = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        router.use(new NuxtRoutes())
        expect(watchCallback).not.toBeDefined()
      } finally {
        process.env.NODE_ENV = env
      }
    })
  })

  describe('in production', () => {
    const env = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = env
    })

    it('should serve static assets before dynamic pages', async () => {
      routes = [{ path: '/*' }]
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.nuxt/dist/client/:path*', {
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
      expect(serveStatic).toHaveBeenCalledWith('.nuxt/dist/client/:path*', {
        exclude: ['service-worker.js', 'LICENSES'],
        permanent: true,
      })
    })

    it('should add routes for all public assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('static/favicon.ico')
    })
  })

  describe('in local development', () => {
    it('should add routes for all static assets', async () => {
      router.use(new NuxtRoutes())
      request.path = '/_nuxt/pages/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
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

    it('should add routes for all pages', async () => {
      routes = [{ path: '/p/:id?' }]
      router.use(new NuxtRoutes())
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: expect.any(Function) })
    })

    it('should add catch-all routes', async () => {
      routes = [{ path: '/p/*' }]
      router.use(new NuxtRoutes())
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: expect.any(Function) })
    })
  })

  describe('in the cloud', () => {
    beforeAll(() => {
      process.env[XDN_ENV_VARIABLES.deploymentType] = 'AWS'
    })

    afterAll(() => {
      delete process.env[XDN_ENV_VARIABLES.deploymentType]
    })
  })

  describe('#loadNuxtRoutes', () => {
    it('should return undefined when the routes file is empty', () => {
      routes = null
      expect(new NuxtRoutes().loadNuxtRoutes()).toBeUndefined()
    })
  })

  describe('#is', () => {
    it('should return true when passed an instance of NuxtRoutes', () => {
      expect(NuxtRoutes.is(new NuxtRoutes())).toBe(true)
    })
    it('should return false when passed anything else', () => {
      expect(NuxtRoutes.is({})).toBe(false)
    })
    it('should return false when passed null', () => {
      expect(NuxtRoutes.is(null)).toBe(false)
    })
  })
})
