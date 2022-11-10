import { join } from 'path'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'

describe('router/AngularRoutes.ts', () => {
  let originalDir = process.cwd()
  let AngularRoutes,
    Router,
    router,
    plugin,
    request,
    response,
    responseHeaders = {},
    renderWithApp,
    serveStatic

  const mockGetOutputPath = mockReturnValue =>
    jest.mock('../../src/utils/getBuildPath', () => ({
      getBuildPath: jest.fn(_ => 'public'),
      getOutputPath: jest.fn(_ => mockReturnValue),
    }))

  const mocksInit = () =>
    jest.isolateModules(() => {
      renderWithApp = jest.fn()
      serveStatic = jest.fn()

      process.chdir(join(__dirname, '..', 'apps', 'default'))

      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'debug').mockImplementation()

      jest.doMock('@edgio/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.onRouteError = jest.fn()
            this.serveStatic = serveStatic
            this.renderWithApp = renderWithApp
          }
        }
      })

      Router = require('@edgio/core/router/Router').default
      AngularRoutes = require('../../src/router/AngularRoutes').default
      plugin = new AngularRoutes()
      router = new Router().use(plugin)

      request = {
        url: '/',
        headers: {
          host: 'domain.com',
        },
        on: (event, cb) => {
          if (event === 'data') setImmediate(() => cb(request.body))
          if (event !== 'data' && event === 'end') setImmediate(cb)
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

  afterAll(() => {
    process.chdir(originalDir)
    jest.resetAllMocks()
  })

  describe('production mode', () => {
    let env = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'production'
    })

    afterAll(() => {
      process.env.NODE_ENV = env
    })

    describe('local', () => {
      describe('is SSR', () => {
        beforeEach(() => {
          mockGetOutputPath('dist/server')
          mocksInit()
        })
        it('should proxy to JS backend via renderWithApp', async () => {
          request.path = '/'
          await router.run(request, response)
          expect(renderWithApp).toHaveBeenCalled()
        })
      })

      describe('is not SSR', () => {
        beforeEach(() => {
          mockGetOutputPath(undefined)
          mocksInit()
        })
        it('should call router.static()', async () => {
          const routerStaticFunc = jest.spyOn(router, 'static').mockImplementation()
          router.use(plugin)
          expect(routerStaticFunc).toHaveBeenCalled()
        })
        it('should serve index.html via serveStatic function', async () => {
          request.path = '/'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
        it('should serve style.css via serveStatic function', async () => {
          request.path = '/style.css'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
        it('should serve static_asset.txt via serveStatic function', async () => {
          request.path = '/static_asset.txt'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
      })
    })

    describe('in the cloud', () => {
      beforeAll(() => {
        process.env[EDGIO_ENV_VARIABLES.deploymentType] = 'AWS'
      })

      afterAll(() => {
        delete process.env[EDGIO_ENV_VARIABLES.deploymentType]
      })

      describe('is SSR', () => {
        beforeEach(() => {
          mockGetOutputPath('dist/server')
          mocksInit()
        })
        it('should proxy to JS backend via renderWithApp', async () => {
          request.path = '/'
          await router.run(request, response)
          expect(renderWithApp).toHaveBeenCalled()
        })
      })

      describe('is not SSR', () => {
        beforeEach(() => {
          mockGetOutputPath(undefined)
          mocksInit()
        })
        it('should call router.static()', async () => {
          const routerStaticFunc = jest.spyOn(router, 'static').mockImplementation()
          router.use(plugin)
          expect(routerStaticFunc).toHaveBeenCalled()
        })
        it('should serve index.html via serveStatic function', async () => {
          request.path = '/'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
        it('should serve style.css via serveStatic function', async () => {
          request.path = '/style.css'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
        it('should serve static_asset.txt via serveStatic function', async () => {
          request.path = '/static_asset.txt'
          await router.run(request, response)
          expect(serveStatic).toHaveBeenCalled()
        })
      })
    })
  })

  describe('development mode', () => {
    beforeEach(() => mocksInit())
    it('should proxy to JS backend via renderWithApp', async () => {
      request.path = '/'
      await router.run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })
  })
})
