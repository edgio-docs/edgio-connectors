import { join } from 'path'
import fs from 'fs'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'

const SW_SRC = join(__dirname, '..', '..', 'default-app', 'all', 'sw', 'service-worker.js')
const SW_DEST = join(__dirname, '..', 'apps', 'default', 'build', 'service-worker.js')

describe('FrontityRoutes.ts', () => {
  let originalDir = process.cwd()
  let FrontityRoutes,
    Router,
    router,
    plugin,
    request,
    response,
    responseHeaders = {},
    renderWithApp,
    serveStatic,
    serviceWorker

  beforeEach(() =>
    jest.isolateModules(() => {
      renderWithApp = jest.fn()
      serveStatic = jest.fn()
      serviceWorker = jest.fn()

      process.chdir(join(__dirname, '..', 'apps', 'default'))

      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'debug').mockImplementation()

      jest.doMock('@edgio/core/router/ResponseWriter', () => {
        return class MockResponseWriter {
          constructor() {
            this.onRouteError = jest.fn()
            this.serveStatic = serveStatic
            this.renderWithApp = renderWithApp
            this.serviceWorker = serviceWorker
          }
        }
      })

      Router = require('@edgio/core/router/Router').default
      FrontityRoutes = require('../../src/FrontityRoutes').default
      plugin = new FrontityRoutes()
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
  )

  beforeAll(() => {
    fs.copyFileSync(SW_SRC, SW_DEST)
  })

  afterAll(() => {
    process.chdir(originalDir)
    jest.resetAllMocks()
    fs.unlinkSync(SW_DEST)
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
      it('should call router.static()', async () => {
        const routerStaticFunc = jest.spyOn(router, 'static').mockImplementation()
        router.use(plugin)
        expect(routerStaticFunc).toHaveBeenCalled()
      })

      it('should serve /service-worker.js via serviceWorker function', async () => {
        request.path = '/service-worker.js'
        await router.run(request, response)
        expect(serviceWorker).toHaveBeenCalled()
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

    describe('in the cloud', () => {
      beforeAll(() => {
        process.env[EDGIO_ENV_VARIABLES.deploymentType] = 'AWS'
      })

      afterAll(() => {
        delete process.env[EDGIO_ENV_VARIABLES.deploymentType]
      })

      it('should call router.static()', async () => {
        const routerStaticFunc = jest.spyOn(router, 'static').mockImplementation()
        router.use(plugin)
        expect(routerStaticFunc).toHaveBeenCalled()
      })

      it('should serve /service-worker.js via serviceWorker function', async () => {
        request.path = '/service-worker.js'
        await router.run(request, response)
        expect(serviceWorker).toHaveBeenCalled()
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

  describe('development mode', () => {
    it('should proxy to JS backend via renderWithApp', async () => {
      request.path = '/'
      await router.run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })
  })
})
