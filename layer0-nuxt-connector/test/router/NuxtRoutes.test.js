import { LAYER0_ENV_VARIABLES } from '@layer0/core/constants'
import { BACKENDS } from '@layer0/core/constants'
import fs from 'fs'
import path from 'path'
import { mockRequest, mockResponse } from './mocks'
import * as assets from '../../src/router/assets'
import addPreloadHeaders from '@layer0/core/router/addPreloadHeaders'

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
    watchCallback,
    routes,
    nuxtConfig,
    NODE_ENV = process.env.NODE_ENV,
    responseWriter

  beforeEach(() => {
    jest.isolateModules(() => {
      routes = []
      nuxtConfig = {}
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()
      renderWithApp = jest.fn()

      jest.spyOn(fs, 'watch').mockImplementation((file, callback) => {
        watchCallback = callback
      })

      jest.spyOn(assets, 'readAsset').mockImplementation(path => {
        if (path.endsWith('routes.json')) {
          return routes ? JSON.stringify(routes) : ''
        } else if (path.endsWith('layer0-nuxt.config.json')) {
          return JSON.stringify(nuxtConfig)
        } else {
          throw new Error(`path ${path} not mocked`)
        }
      })

      jest.doMock('@layer0/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            responseWriter = this
            this.cache = cache
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.proxy = proxy
            this.render = cb => cb(request, response, {})
            this.stream = stream
            this.setRequestHeader = setRequestHeader
            this.renderWithApp = renderWithApp
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

      const glob = require(path.join(
        require.resolve('@layer0/core'),
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

      request = mockRequest()
      response = mockResponse(responseHeaders)

      NuxtRoutes = require('../../src/router/NuxtRoutes').default
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

    it('should fallback to dynamic 404', async () => {
      request.path = '/not-found'
      await new Router().use(new NuxtRoutes()).run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
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

    it('should add a fallback to Nuxt', async () => {
      routes = [{ path: '/p/*' }]
      router.use(new NuxtRoutes())
      request.path = '/not-found-page'
      await router.run(request, response)
      expect(renderWithApp).toHaveBeenCalledWith()
    })
  })

  describe('in the cloud', () => {
    beforeAll(() => {
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
    })

    afterAll(() => {
      delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
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

  describe('static apps', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = NODE_ENV
    })

    describe('fallback: true', () => {
      beforeEach(() => {
        routes = [
          {
            name: 'static',
            path: '/static',
          },
          {
            name: 'checkout',
            path: '/checkout',
          },
          {
            name: 'dynamic-dynamic',
            path: '/dynamic/:dynamic?',
          },
          {
            name: 'static-dynamic-static_dynamic',
            path: '/static-dynamic/:static_dynamic?',
          },
        ]

        nuxtConfig = {
          target: 'static',
          generate: {
            fallback: true,
            exclude: [
              { type: 'RegExp', value: '/dynamic/.*' },
              { type: 'string', value: '/checkout' },
            ],
          },
        }
      })

      it('should serve 404.html', async () => {
        request.path = '/static'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(serveStatic).toHaveBeenCalledWith('dist/static/index.html', {
          loadingPage: undefined,
          onNotFound: expect.any(Function),
        })

        // verify that it falls back to SSR
        const { onNotFound } = serveStatic.mock.calls[0][1]
        await onNotFound(responseWriter)
        expect(serveStatic).toHaveBeenCalledWith('dist/404.html', {
          statusCode: 404,
          statusMessage: 'Not Found',
        })
      })

      it('should serve 404.html when no route matches the request', async () => {
        request.path = '/no-match'
        await new Router().use(new NuxtRoutes()).run(request, response)
        expect(serveStatic).toHaveBeenCalledWith('dist/404.html', {
          statusCode: 404,
          statusMessage: 'Not Found',
        })
      })
    })

    describe('fallback: false', () => {
      beforeEach(() => {
        routes = [
          {
            name: 'static',
            path: '/static',
          },
          {
            name: 'checkout',
            path: '/checkout',
          },
          {
            name: 'dynamic-dynamic',
            path: '/dynamic/:dynamic?',
          },
          {
            name: 'static-dynamic-static_dynamic',
            path: '/static-dynamic/:static_dynamic?',
          },
        ]

        nuxtConfig = {
          target: 'static',
          generate: {
            fallback: false,
            exclude: [
              { type: 'RegExp', value: '/dynamic/.*' },
              { type: 'string', value: '/checkout' },
            ],
          },
        }
      })

      it('should serve 404.js', async () => {
        request.path = '/static'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(serveStatic).toHaveBeenCalledWith('dist/static/index.html', {
          loadingPage: undefined,
          onNotFound: undefined,
        })
      })
    })

    describe('fallback w/custom page', () => {
      beforeEach(() => {
        routes = [
          {
            name: 'static',
            path: '/static',
          },
          {
            name: 'checkout',
            path: '/checkout',
          },
          {
            name: 'dynamic-dynamic',
            path: '/dynamic/:dynamic?',
          },
          {
            name: 'static-dynamic-static_dynamic',
            path: '/static-dynamic/:static_dynamic?',
          },
        ]

        nuxtConfig = {
          target: 'static',
          generate: {
            fallback: 'fallback.html',
            exclude: [
              { type: 'RegExp', value: '/dynamic/.*' },
              { type: 'string', value: '/checkout' },
            ],
          },
        }
      })

      it('should serve 404.js', async () => {
        request.path = '/static'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(serveStatic).toHaveBeenCalledWith('dist/static/index.html', {
          loadingPage: 'dist/fallback.html',
          onNotFound: expect.any(Function),
        })

        // verify that it falls back to SSR
        const { onNotFound } = serveStatic.mock.calls[0][1]
        await onNotFound(responseWriter)
        expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: addPreloadHeaders })
      })
    })

    describe('no fallback', () => {
      beforeEach(() => {
        routes = [
          {
            name: 'static',
            path: '/static',
          },
          {
            name: 'checkout',
            path: '/checkout',
          },
          {
            name: 'dynamic-dynamic',
            path: '/dynamic/:dynamic?',
          },
          {
            name: 'static-dynamic-static_dynamic',
            path: '/static-dynamic/:static_dynamic?',
          },
        ]

        nuxtConfig = {
          target: 'static',
          generate: {
            exclude: [
              { type: 'RegExp', value: '/dynamic/.*' },
              { type: 'string', value: '/checkout' },
            ],
          },
        }
      })

      it('should serve static pages and fallback to SSR', async () => {
        request.path = '/static'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(serveStatic).toHaveBeenCalledWith('dist/static/index.html', {
          loadingPage: 'dist/200.html',
          onNotFound: expect.any(Function),
        })

        // verify that it falls back to SSR
        const { onNotFound } = serveStatic.mock.calls[0][1]
        await onNotFound(responseWriter)
        expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: addPreloadHeaders })
      })

      it('should run SSR for excluded RegExp paths', async () => {
        request.path = '/dynamic/1'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: addPreloadHeaders })
        expect(serveStatic).not.toHaveBeenCalled()
      })

      it('should run SSR for excluded string paths', async () => {
        request.path = '/checkout'
        await new Router().use(new NuxtRoutes()).run(request, response)

        // verify that the route is handled with serveStatic
        expect(proxy).toHaveBeenCalledWith(BACKENDS.js, { transformResponse: addPreloadHeaders })
        expect(serveStatic).not.toHaveBeenCalled()
      })
    })
  })
})
