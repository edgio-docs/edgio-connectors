import path, { join } from 'path'
import { LAYER0_ENV_VARIABLES } from '@layer0/core/constants'
import { BACKENDS } from '@layer0/core/constants'
import * as coreWatch from '@layer0/core/utils/watch'
import { LAYER0_IMAGE_OPTIMIZER_PATH } from '../../../../cli/src/constants'

const originalDir = process.cwd()

describe('NextRoutes', () => {
  let NextRoutes,
    Router,
    router,
    plugin,
    renderNextPage,
    renderWithApp,
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
    loadConfig = {},
    watch,
    watchCallback,
    rewrite,
    warn,
    responseWriter

  function init() {
    watch = jest.fn()
    cache = jest.fn()
    serveStatic = jest.fn()
    proxy = jest.fn()
    redirect = jest.fn()
    stream = jest.fn()
    setRequestHeader = jest.fn()
    updatePath = jest.fn()
    rewrite = jest.fn()
    renderWithApp = jest.fn()

    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'debug').mockImplementation()
    warn = jest.spyOn(console, 'warn').mockImplementation()

    watch = jest.spyOn(coreWatch, 'default').mockImplementation(() => {
      return {
        on: (_filter, cb) => {
          watchCallback = cb
        },
      }
    })
    jest.doMock('../../../src/util/getNextVersion', () => () => '10.0.0')

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
          this.renderWithApp = renderWithApp
          responseWriter = this
        }
      }
    })

    global.LAYER0_NEXT_APP = {
      get nextConfig() {
        return config
      },
      loadConfig() {
        return loadConfig
      },
    }

    renderNextPage = jest.fn(() => 'renderNextPage!')
    jest.doMock('@layer0/next/router/renderNextPage', () => renderNextPage)
    Router = require('@layer0/core/router/Router').default

    NextRoutes = require('@layer0/next/router/NextRoutes').default
    router = new Router()
    plugin = new NextRoutes()
    router.use(plugin)
    router.setBackend('__js__', { domainOrIp: 'js.backend' })
    router.setBackend('origin', { domainOrIp: 'example.com' })

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
  }

  describe('target: "serverless"', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        init()
      })
    })

    describe('#updateRoutes', () => {
      it('should not throw an error', () => {
        expect(() => plugin.updateRoutes()).not.toThrowError()
      })
    })

    describe('in local development', () => {
      describe('with nextConfig', () => {
        beforeAll(() => {
          config = {
            async rewrites() {
              return [
                {
                  source: '/rewrites',
                  has: [{ type: 'query', key: 'foo', value: 'bar' }, { type: 'invalid type' }],
                  destination: '/p/1',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'query', key: 'q' }],
                  destination: '/p/1',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'header', key: 'x-rewrite-me', value: 'true' }],
                  destination: '/p/2',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'header', key: 'x-rewrite-me-empty' }],
                  destination: '/p/2',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'cookie', key: 'x-rewrite-me', value: 'true' }],
                  destination: '/p/3',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'cookie', key: 'x-rewrite-me-empty' }],
                  destination: '/p/2',
                },
                {
                  source: '/rewrites',
                  has: [{ type: 'host', value: 'localhost' }],
                  destination: '/p/4',
                },
                {
                  source: '/rewrites/origin',
                  destination: 'https://example.com/path',
                },
                {
                  source: '/rewrites/origin/root',
                  destination: 'https://example.com',
                },
                {
                  source: '/rewrites/upstream/root',
                  destination: 'https://upstream.com',
                },
                {
                  source: '/rewrites/:id',
                  destination: '/p/:id',
                },
                // Same path as redirect added to test redirect being resolved with higher priority
                {
                  source: '/redirects/:id',
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

          expect(watch).toHaveBeenCalledWith(join(process.cwd(), 'pages'))

          watchCallback()
          expect(updateRoutes).toHaveBeenCalled()
        })

        it('should accept directory parameter', () => {
          new Router().use(new NextRoutes('apps/my-next-app'))

          expect(watch).toHaveBeenCalledWith(join(process.cwd(), 'apps/my-next-app/src/pages'))
        })

        describe('rewrites', () => {
          it('should proxy full URLs', done => {
            process.nextTick(async () => {
              request.path = '/rewrites/origin'
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith('origin', { path: '/path' })
              done()
            })
          })
          it('should proxy full URLs without a path', done => {
            process.nextTick(async () => {
              request.path = '/rewrites/origin/root'
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith('origin', { path: '/' })
              done()
            })
          })
          it('should warn the user when no matching backend could be found', done => {
            process.nextTick(() => {
              expect(warn).toHaveBeenCalledWith(expect.stringMatching(/No matching backend/))
              done()
            })
          })
          it('should add routes for rewrites', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites/1'
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support query', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.query = { foo: 'bar' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support query without a value', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.query = { q: 'bar' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support headers', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.headers = { 'x-rewrite-me': 'true' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support headers without values', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.headers = { 'x-rewrite-me-empty': 'true' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support cookie', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.headers = { cookie: 'x-rewrite-me=true' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support cookie without a value', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.headers = { cookie: 'x-rewrite-me-empty=true' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
          it('should support host', async done => {
            process.nextTick(async () => {
              request.path = '/rewrites'
              request.headers = { host: 'localhost' }
              await router.run(request, response)
              expect(proxy).toHaveBeenCalledWith(BACKENDS.js)
              done()
            })
          })
        })

        it('should add routes for redirects (with priority over other routes)', async done => {
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

      describe('with loadConfig', () => {
        beforeAll(() => {
          config = undefined
          loadConfig = {
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
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/ssg/ssg/index.html',
          {
            disableAutoPublish: true,
            onNotFound: expect.any(Function),
          }
        )
      })

      it('should add data routes for all static pages with getStaticProps only', async () => {
        request.path = '/_next/data/build-id/ssg/ssg.json'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/ssg/ssg/index.json',
          {
            disableAutoPublish: true,
            onNotFound: expect.any(Function),
          }
        )
        await serveStatic.mock.calls[0][1].onNotFound()
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
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/ssg/ssg/index.html',
          {
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
          }
        )
      })

      it('should add routes for all static pages with getStaticPaths', async () => {
        request.path = '/static/1'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/static/:id/index.html',
          {
            loadingPage: '.next/serverless/pages/:locale/static/[id]/index.html',
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
          }
        )
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
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/static/:id/index.html',
          {
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
            loadingPage: '.next/serverless/pages/:locale/static/[id]/index.html',
          }
        )
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
          '.next/serverless/pages/:locale/no-props/no-props/index.html',
          {
            disableAutoPublish: true,
            onNotFound: expect.any(Function),
          }
        )
      })

      it('should add localized routes for all static pages without getStaticProps', async () => {
        request.path = '/fr/no-props/no-props'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/no-props/no-props/index.html',
          {
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
          }
        )
      })

      // it('should add localized routes the homepage without getStaticProps', async () => {
      //   request.path = '/index'
      //   await router.run(request, response)
      //   expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/:locale/index.html', {
      //     onNotFound: expect.any(Function),
      //   })
      // })

      it('should add routes for non-localized static pages', async () => {
        request.path = '/not-localized'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/:locale/not-localized/index.html',
          {
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
          }
        )
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
        it('should show a warning when the destination for a rewrite cannot be found', async () => {
          new Router().use(new NextRoutes())
          request.path = '/no-matching-rewrite'
          await router.run(request, response)
          expect(warn).toHaveBeenCalledWith(
            'No matching route found for rewrite /no-matching-rewrite => /not-defined'
          )
        })
      })

      describe('prerendering', () => {
        it('should prerender everything in prerender-manifest.json', () => {
          expect(router.preloadRequests.options).toEqual([
            [
              { path: '/en-US' },
              { path: '/_next/data/123/en-US.json' },
              { path: '/fr' },
              { path: '/_next/data/123/fr.json' },
              { path: '/nl-NL' },
              { path: '/_next/data/123/nl-NL.json' },
              { path: '/en-US/static/1' },
              { path: '/_next/data/123/en-US/static/1.json' },
              { path: '/en-US/static/2' },
              { path: '/_next/data/123/en-US/static/2.json' },
              { path: '/en-US/ssg/ssg' },
              { path: '/_next/data/123/en-US/ssg/ssg.json' },
              { path: '/fr/ssg/ssg' },
              { path: '/_next/data/123/fr/ssg/ssg.json' },
              { path: '/nl-NL/ssg/ssg' },
              { path: '/_next/data/123/nl-NL/ssg/ssg.json' },
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
        expect(renderNextPage).toHaveBeenCalledWith(
          '404',
          expect.anything(),
          expect.any(Function),
          {
            rewritePath: false,
          }
        )
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

      it('should add routes for files in .next/server', async () => {
        request.path = '/_next/server/middleware-manifest.json'
        await router.run(request, response)
        expect(cache).toHaveBeenCalledWith({ edge: { maxAgeSeconds: 315360000 } })
        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/:file')
      })

      it('should serve server assets', async () => {
        request.path = '/_next/server/middleware-manifest.json'
        await router.run(request, response)
        expect(cache).toHaveBeenCalledWith({ edge: { maxAgeSeconds: 315360000 } })
        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/:file')
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
        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/ssg/ssg/index.html', {
          onNotFound: expect.any(Function),
          disableAutoPublish: true,
        })
      })

      it('should add routes for all static pages with getStaticPaths', async () => {
        request.path = '/static-fallback/1'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/static-fallback/:id/index.html',
          {
            loadingPage: '.next/serverless/pages/static-fallback/[id]/index.html',
            onNotFound: expect.any(Function),
            disableAutoPublish: true,
          }
        )
      })

      it('should serve a 404 for unrendered static pages without a fallback', async () => {
        request.path = '/static/999'
        await router.run(request, response)

        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/static/:id/index.html', {
          loadingPage: undefined,
          onNotFound: expect.any(Function),
          disableAutoPublish: true,
        })

        const { onNotFound } = serveStatic.mock.calls[0][1]
        await onNotFound(responseWriter)

        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/404/index.html', {
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
        expect(serveStatic).toHaveBeenCalledWith('.next/serverless/pages/404/index.html', {
          statusCode: 404,
          statusMessage: 'Not Found',
        })
      })

      it('should add routes for all static pages without getStaticProps', async () => {
        request.path = '/no-props/no-props'
        await router.run(request, response)
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/no-props/no-props/index.html',
          {
            disableAutoPublish: true,
            onNotFound: expect.any(Function),
          }
        )
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
        expect(serveStatic).toHaveBeenCalledWith(
          '.next/serverless/pages/404/index.html',
          expect.anything()
        )
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

  describe('target: "server"', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        process.env.NEXT_FORCE_SERVER_BUILD = 'true'
        init()
      })
    })

    afterEach(() => {
      delete process.env.NEXT_FORCE_SERVER_BUILD
    })

    it('call proxy', async () => {
      await router.run(request, response)
      expect(proxy).toHaveBeenCalledWith(BACKENDS.js, expect.anything())
    })
  })
})

describe('when attempting to capture named parameters in rewrites', () => {
  let env = process.env.NODE_ENV

  beforeAll(() => {
    process.chdir(join(__dirname, '..', '..', 'apps', 'NextRoutes-cloud-bad-has'))
    process.env.NODE_ENV = 'production'
  })

  afterAll(() => {
    process.chdir(originalDir)
    process.env.NODE_ENV = env
  })

  it('should throw a helpful error message', () => {
    expect(() => {
      const Router = require('@layer0/core/router').Router
      const NextRoutes = require('../../../src/router/NextRoutes').default
      new Router().use(new NextRoutes())
    }).toThrowError(/Layer0 does not yet support capturing named parameters/)
  })
})
