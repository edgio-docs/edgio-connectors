import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME, STATIC_ORIGIN_NAME } from '@edgio/core/origins'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'
import { join } from 'path'
import { FAR_FUTURE_TTL } from '@edgio/core/constants'

describe('router/AngularRoutes.ts', () => {
  let originalDir, AngularRoutes, angularRoutes, router, rules, mockOutputPath

  beforeAll(() => {
    originalDir = process.cwd()

    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('../../src/utils/getBuildPath', () => ({
        getBuildPath: jest.fn(_ => 'public'),
        getOutputPath: jest.fn(_ => mockOutputPath),
      }))
      AngularRoutes = require('../../src/router/AngularRoutes').default
    })
  })

  afterAll(() => {
    process.chdir(originalDir)
    jest.resetAllMocks()
  })

  const init = () => {
    process.chdir(join(__dirname, '..', 'apps', 'default'))
    angularRoutes = new AngularRoutes()
    router = new Router().use(angularRoutes)
    rules = router.rules
  }

  describe('production mode', () => {
    beforeEach(() => {
      process.env[EDGIO_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'
      init()
    })

    afterAll(() => {
      delete process.env[EDGIO_ENV_VARIABLES.deploymentType]
      delete process.env.NODE_ENV
    })

    describe('server', () => {
      beforeAll(() => {
        mockOutputPath = 'dist/server'
      })

      it('should render all pages with renderWithApp by default', async () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
        const { origin } = rule?.if[1]
        expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
      })

      it('should add rule for assets in build folder', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/style.css'))
        const rulePaths = rule?.if?.[0]?.['in']?.[1]

        const { caching, origin } = rule?.if[1]

        expect(rulePaths).toContain('/')
        expect(rulePaths).toContain('/style.css')
        expect(rulePaths).toContain('/static_asset.txt')

        expect(caching.max_age).toBe(FAR_FUTURE_TTL)
        expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
      })
    })

    describe('static', () => {
      beforeAll(() => {
        mockOutputPath = undefined
      })

      it('should render all pages with static SPA page by default', async () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
        const { origin } = rule?.if[1]
        expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
      })

      it('should add rule for assets in build folder', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/style.css'))
        const rulePaths = rule?.if?.[0]?.['in']?.[1]

        const { caching, origin } = rule?.if[1]

        expect(rulePaths).toContain('/')
        expect(rulePaths).toContain('/style.css')
        expect(rulePaths).toContain('/static_asset.txt')

        expect(caching.max_age).toBe(FAR_FUTURE_TTL)
        expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
      })
    })
  })

  describe('development mode', () => {
    beforeEach(init)
    it('should render all pages with renderWithApp', async () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })
  })
})
