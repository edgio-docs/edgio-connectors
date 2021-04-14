import path, { join } from 'path'
import { LAYER0_ENV_VARIABLES } from '@layer0/core/constants'
import { BACKENDS } from '@layer0/core/constants'
import fs from 'fs'
import { LAYER0_IMAGE_OPTIMIZER_PATH } from '../../../../cli/src/constants'

const originalDir = process.cwd()

describe('NextRoutes', () => {
  let NextRoutes,
    Router,
    router,
    plugin,
    renderNextPage,
    request,
    response,
    responseHeaders = {},
    cache,
    serveStatic,
    proxy,
    redirect,
    setRequestHeader,
    stream,
    updatePath,
    config = {},
    watch,
    watchCallback,
    rewrite,
    warn,
    responseWriter

  beforeEach(() => {
    jest.isolateModules(() => {
      watch = jest.fn()
      cache = jest.fn()
      serveStatic = jest.fn()
      proxy = jest.fn()
      redirect = jest.fn()
      stream = jest.fn()
      setRequestHeader = jest.fn()
      updatePath = jest.fn()
      rewrite = jest.fn()

      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'debug').mockImplementation()
      warn = jest.spyOn(console, 'warn').mockImplementation()

      watch = jest
        .spyOn(fs, 'watch')
        .mockImplementation((file, options, cb) => (watchCallback = cb))

      jest.doMock('../../../src/util/getDistDir', () => () => '.next')

      jest.doMock(
        path.join(process.cwd(), 'static-asset-manifest.json'),
        () => ({
          public: ['favicon.ico'],
          pages: ['p/[id].js'],
          '.next/serverless/pages': ['index.html'],
        }),
        { virtual: true }
      )

      jest.doMock('@layer0/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.cache = cache
            this.serveStatic = serveStatic
            this.onRouteError = jest.fn()
            this.proxy = proxy
            this.redirect = redirect
            this.render = cb => cb(request, response, {})
            this.stream = stream
            this.setRequestHeader = setRequestHeader
            this.request = { params: {} }
            this.response = {}
            this.updatePath = updatePath
            this.rewrite = rewrite
            responseWriter = this
          }
        }
      })

      global.LAYER0_NEXT_APP = {
        get nextConfig() {
          return config
        },
      }

      renderNextPage = jest.fn(() => 'renderNextPage!')
      jest.doMock('@layer0/next/router/renderNextPage', () => renderNextPage)
      Router = require('@layer0/core/router/Router').default
      NextRoutes = require('@layer0/next/router/NextRoutes').default
      plugin = new NextRoutes()
      router = new Router()
      router.use(plugin)
      router.setBackend('__js__', { domainOrIp: 'js.backend' })

      request = {
        url: '/',
        headers: {
          host: 'domain.com',
        },
        on: (event, cb) => {
          if (event === 'data') {
            setImmediate(() => cb(''))
          } else if (event === 'end') {
            setImmediate(cb)
          }
        },
      }

      response = {
        writeHead: jest.fn(),
        end: jest.fn(),
        getHeaders: () => ({}),
        setHeader: jest.fn((header, value) => {
          responseHeaders[header] = value
        }),
      }
    })
  })

  describe('#updateRoutes', () => {
    it('should not throw an error', () => {
      expect(() => plugin.updateRoutes()).not.toThrowError()
    })
  })

  describe('in local development', () => {
    beforeAll(() => {
      config = {
        async rewrites() {
          return [
            {
              source: '/rewrites/:id',
              destination: '/p/:id',
            },
          ]
        },
        async redirects() {
          return [
            {
              source: '/redirects/:id',
              destination: '/p/:id',
            },
          ]
        },
      }
      process.chdir(join(__dirname, '..', '..', 'apps', 'NextRoutes-dev'))
    })

    afterAll(() => {
      process.chdir(originalDir)
      delete global.LAYER0_NEXT_APP
    })

    it('should add routes for all pages and api endpoints', async () => {
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add routes for all static assets', async () => {
      request.path = '/_next/static/development/pages/index.js'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should serve assets in the public dir', async () => {
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('public/favicon.ico')
    })

    it('should call router image optimizer with pass through', async () => {
      request.path = '/_next/image'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js, undefined)
    })

    it('should add routes for all pages and api endpoints', async () => {
      request.path = '/p/1'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add routes for tsx pages', async () => {
      request.path = '/typescript'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add routes for getServerSideProps', async () => {
      request.path = '/_next/data/development/p/1.json'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add index routes for getServerSideProps properly', async () => {
      request.path = '/_next/data/development/index.json'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
    })

    it('should add a route for webpack hmr', async () => {
      request.path = '/_next/webpack-hmr'
      await router.run(request, response)
      expect(stream).toHaveBeenCalled()
    })

    it('should watch pages for changes', () => {
      const updateRoutes = jest.spyOn(NextRoutes.prototype, 'updateRoutes')
      new Router().use(new NextRoutes())

      expect(watch).toHaveBeenCalledWith(
        join(process.cwd(), 'pages'),
        { recursive: true },
        expect.any(Function)
      )

      watchCallback()
      expect(updateRoutes).toHaveBeenCalled()
    })

    it('should accept directory parameter', () => {
      new Router().use(new NextRoutes('apps/my-next-app'))

      expect(watch).toHaveBeenCalledWith(
        join(process.cwd(), 'apps/my-next-app/src/pages'),
        { recursive: true },
        expect.any(Function)
      )
    })

    it('should add routes for rewrites', async done => {
      process.nextTick(async () => {
        request.path = '/rewrites/1'
        await router.run(request, response)
        expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
        done()
      })
    })

    it('should add routes for redirects', async done => {
      process.nextTick(async () => {
        request.path = '/redirects/1'
        await router.run(request, response)
        expect(redirect).toHaveBeenCalledWith('/p/:id', { statusCode: 302 })
        done()
      })
    })

    it('should render the 404 page when no route is matched', async done => {
      process.nextTick(async () => {
        request.path = '/no-route-matched'
        await router.run(request, response)
        expect(renderNextPage).toHaveBeenCalledWith(
          '404',
          expect.anything(),
          expect.any(Function),
          { rewritePath: false }
        )
        done()
      })
    })

    it('should render a 404 page directly', async done => {
      const nextRoutes = new NextRoutes()
      const router = new Router()
        .get('/missing-page', res => nextRoutes.render404(res))
        .use(nextRoutes)

      process.nextTick(async () => {
        request.path = '/missing-page'
        await router.run(request, response)
        expect(renderNextPage).toHaveBeenCalledWith(
          '404',
          expect.anything(),
          expect.any(Function),
          {
            rewritePath: false,
          }
        )
        done()
      })
    })
  })

  describe('in the cloud (localized)', () => {
    const env = process.env.NODE_ENV

    beforeAll(() => {
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
      process.chdir(join(__dirname, '..', '..', 'apps', 'NextRoutes-cloud-localized'))
    })

    afterAll(() => {
      delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
      process.chdir(originalDir)
      process.env.NODE_ENV = env
    })

    it('should add routes for all public assets', async () => {
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(cache).toHaveBeenCalledWith({ edge: { maxAgeSeconds: 315360000 } })
      expect(serveStatic).toHaveBeenCalledWith('public/favicon.ico')
    })

    it('should add routes for all static assets', async () => {
      request.path = '/_next/static/development/pages/index.js'
      await router.run(request, response)
      expect(cache).toHaveBeenCalledWith({
        browser: { maxAgeSeconds: 315360000 },
        edge: { maxAgeSeconds: 315360000 },
      })
      expect(serveStatic).toHaveBeenCalledWith('.next/static/:path*', {
        permanent: true,
        exclude: ['.next/static/service-worker.js'],
      })
    })

    it('should add routes getServerSideProps', async () => {
      request.path = '/_next/data/cbdacbdbcdbacbd/p/1.json'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalled()
    })

    it('should add routes for all static pages with getStaticProps only', async () => {
      request.path = '/ssg/ssg'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/ssg/ssg.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should add data routes for all static pages with getStaticProps only', async () => {
      request.path = '/_next/data/build-id/ssg/ssg.json'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/ssg/ssg.json', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should call router image optimizer with layer0-buffer-proxy prefix', async () => {
      request.path = '/_next/image'
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.imageOptimizer, {
        path: LAYER0_IMAGE_OPTIMIZER_PATH,
      })
    })

    it('should add localized routes for all static pages with getStaticProps only', async () => {
      request.path = '/fr/ssg/ssg'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/ssg/ssg.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should add routes for all static pages with getStaticPaths', async () => {
      request.path = '/static/1'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/static/:id.html', {
        onNotFound: expect.any(Function),
        loadingPage: '.next/serverless/pages/:locale/static/[id].html',
      })
      serveStatic.mock.calls[0][1].onNotFound()
      expect(renderNextPage).toHaveBeenCalledWith(
        '/static/[id]',
        expect.anything(),
        expect.any(Function),
        { rewritePath: false }
      )
    })

    it('should add localized routes for all static pages with getStaticPaths', async () => {
      request.path = '/fr/static/1'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/static/:id.html', {
        onNotFound: expect.any(Function),
        loadingPage: '.next/serverless/pages/:locale/static/[id].html',
      })
      serveStatic.mock.calls[0][1].onNotFound()
      expect(renderNextPage).toHaveBeenCalledWith(
        '/static/[id]',
        expect.anything(),
        expect.any(Function),
        { rewritePath: false }
      )
    })

    it('should add routes for all static pages without getStaticProps', async () => {
      request.path = '/no-props/no-props'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith(
        '.next/serverless/pages/:locale/no-props/no-props.html',
        {
          onNotFound: expect.any(Function),
          loadingPage: undefined,
        }
      )
    })

    it('should add localized routes for all static pages without getStaticProps', async () => {
      request.path = '/fr/no-props/no-props'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith(
        '.next/serverless/pages/:locale/no-props/no-props.html',
        {
          onNotFound: expect.any(Function),
          loadingPage: undefined,
        }
      )
    })

    it('should add routes for non-localized static pages', async () => {
      request.path = '/not-localized'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/not-localized.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should add routes for all api pages', async () => {
      request.path = '/api/session'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalled()
    })

    it('should not watch pages in production', () => {
      jest.resetAllMocks()
      new NextRoutes()
      expect(watch).not.toHaveBeenCalled()
    })

    describe('redirects', () => {
      it('should add redirects to the router', async () => {
        request.path = '/temp-redirects/1'
        await router.run(request, response)
        expect(redirect).toHaveBeenCalledWith('/p/:id', { statusCode: 307 })
      })

      it('should add permanent redirects to the router as 301s', async () => {
        request.path = '/perm-redirects/1'
        await router.run(request, response)
        expect(redirect).toHaveBeenCalledWith('/p/:id', { statusCode: 308 })
      })

      it('should not use next built-in redirect to remove trailing slashes (/:path+)', async () => {
        request.path = '/products/'
        await router.run(request, response)
        expect(redirect).not.toHaveBeenCalled()
      })
    })

    describe('rewrites', () => {
      it('should show a warning when the destination for a rewrite cannot be found', done => {
        new Router().use(new NextRoutes())
        process.nextTick(() => {
          expect(warn).toHaveBeenCalledWith(
            'No matching route found for rewrite /no-matching-rewrite => /not-defined'
          )
          done()
        })
      })
    })

    describe('prerendering', () => {
      it('should prerender everything in prerender-manifest.json', () => {
        expect(router.preloadRequests.options).toEqual([
          [
            { path: '/' },
            { path: '/en-US/static/1' },
            { path: '/_next/data/YZASQ6pQlDxn8KydMz9qu/en-US/static/1.json' },
            { path: '/en-US/static/2' },
            { path: '/_next/data/YZASQ6pQlDxn8KydMz9qu/en-US/static/2.json' },
            { path: '/ssg/ssg' },
            { path: '/_next/data/YZASQ6pQlDxn8KydMz9qu/ssg/ssg.json' },
          ],
        ])
      })
    })

    describe('onRegister', () => {
      beforeEach(() => {
        jest.resetAllMocks()
      })

      it('fallback method should be called', () => {
        const router = new Router()
        const plugin = new NextRoutes()
        const fallbackMock = jest.spyOn(router, 'fallback')
        fallbackMock.mockImplementation()
        router.use(plugin)
        expect(fallbackMock).toHaveBeenCalled()
      })
    })
  })

  describe('with a dynamic 404 page', () => {
    let env = process.env.NODE_ENV

    beforeAll(() => {
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
      process.chdir(join(__dirname, '..', '..', 'apps', 'dynamic-404'))
    })

    afterAll(() => {
      delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
      process.chdir(originalDir)
      process.env.NODE_ENV = env
    })

    it('should SSR the 404 page', async () => {
      request.path = '/no-page-here'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalledWith('404', expect.anything(), expect.any(Function), {
        rewritePath: false,
      })
    })
  })

  describe('in the cloud (not localized)', () => {
    const env = process.env.NODE_ENV

    beforeAll(() => {
      process.env[LAYER0_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
      process.chdir(join(__dirname, '..', '..', 'apps', 'NextRoutes-cloud'))
    })

    afterAll(() => {
      delete process.env[LAYER0_ENV_VARIABLES.deploymentType]
      process.chdir(originalDir)
      process.env.NODE_ENV = env
    })

    it('should add routes for all public assets', async () => {
      request.path = '/favicon.ico'
      await router.run(request, response)
      expect(cache).toHaveBeenCalledWith({ edge: { maxAgeSeconds: 315360000 } })
      expect(serveStatic).toHaveBeenCalledWith('public/favicon.ico')
    })

    it('should add routes for all static assets', async () => {
      request.path = '/_next/static/development/pages/index.js'
      await router.run(request, response)
      expect(cache).toHaveBeenCalledWith({
        browser: { maxAgeSeconds: 315360000 },
        edge: { maxAgeSeconds: 315360000 },
      })
      expect(serveStatic).toHaveBeenCalledWith('.next/static/:path*', {
        permanent: true,
        exclude: ['.next/static/service-worker.js'],
      })
    })

    it('should add routes getServerSideProps', async () => {
      request.path = '/_next/data/cbdacbdbcdbacbd/p/1.json'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalled()
    })

    it('should add routes for all static pages with getStaticProps only', async () => {
      request.path = '/ssg/ssg'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/ssg/ssg.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should add routes for all static pages with getStaticPaths', async () => {
      request.path = '/static-fallback/1'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/static-fallback/:id.html', {
        onNotFound: expect.any(Function),
        loadingPage: '.next/serverless/pages/static-fallback/[id].html',
      })
    })

    it('should serve a 404 for unrendered static pages without a fallback', async () => {
      request.path = '/static/999'
      await router.run(request, response)

      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/static/:id.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })

      const { onNotFound } = serveStatic.mock.calls[0][1]
      await onNotFound(responseWriter)

      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/404.html', {
        statusCode: 404,
        statusMessage: 'Not Found',
      })
    })

    it('should render a 404 page directly', async () => {
      const nextRoutes = new NextRoutes()
      const router = new Router()
      router.get('/missing-page', res => nextRoutes.render404(res))
      request.path = '/missing-page'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/404.html', {
        statusCode: 404,
        statusMessage: 'Not Found',
      })
    })

    it('should add routes for all static pages without getStaticProps', async () => {
      request.path = '/no-props/no-props'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/no-props/no-props.html', {
        onNotFound: expect.any(Function),
        loadingPage: undefined,
      })
    })

    it('should add routes for all api pages', async () => {
      request.path = '/api/session'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalled()
    })

    it('should not add a data route for pages with getInitialProps', async () => {
      request.path = '/initial-props/1'
      await router.run(request, response)
      expect(renderNextPage).toHaveBeenCalledWith(
        'initial-props/[id]',
        expect.anything(),
        expect.any(Function),
        { rewritePath: false }
      )

      request.path = '/_next/data/development/initial-props/1.json'
      await router.run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/404.html', expect.anything())
    })

    describe('redirects', () => {
      it('should add redirects to the router', async () => {
        request.path = '/temp-redirects/1'
        await router.run(request, response)
        expect(redirect).toHaveBeenCalledWith('/p/:id', { statusCode: 307 })
      })

      it('should add permanent redirects to the router as 301s', async () => {
        request.path = '/perm-redirects/1'
        await router.run(request, response)
        expect(redirect).toHaveBeenCalledWith('/p/:id', { statusCode: 308 })
      })

      it('should not use next built-in redirect to remove trailing slashes (/:path+)', async () => {
        request.path = '/products/'
        await router.run(request, response)
        expect(redirect).not.toHaveBeenCalled()
      })
    })
  })

  describe('in local production mode', () => {
    const env = process.env.NODE_ENV

    beforeEach(() => {
      process.env.LAYER0_LOCAL = 'true'
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = env
      delete process.env.LAYER0_LOCAL
    })

    it('should proxy /_next/image to the image optimizer backend', async () => {
      try {
        process.env.LAYER0_LOCAL = 'true'
        process.env.NODE_ENV = 'production'
      } finally {
        request.path = '/_next/image'
        await router.run(request, response)
        expect(proxy).toHaveBeenCalledWith(BACKENDS.imageOptimizer, {
          path: '/__layer0_image_optimizer',
        })
      }
    })
  })
})
