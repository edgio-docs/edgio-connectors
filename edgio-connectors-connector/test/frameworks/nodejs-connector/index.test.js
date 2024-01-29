import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME, STATIC_ORIGIN_NAME } from '@edgio/core/origins'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'
import { join } from 'path'
import { FAR_FUTURE_TTL } from '@edgio/core/constants'
import { connectorRoutes } from '../../../src/index'

describe('NodejsRoutes.ts', () => {
  let originalDir, router, rules

  beforeAll(() => {
    originalDir = process.cwd()
    process.chdir(join(__dirname, 'app'))
  })

  afterAll(() => {
    process.chdir(originalDir)
  })

  const init = () => {
    router = new Router().use(connectorRoutes)
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

    it('should render all pages with renderWithApp by default', async () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })

    it('should add rule for service-worker', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })

    it('should add rule for static folder', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/style.css'))
      const rulePaths = rule?.if?.[0]?.['in']?.[1]

      const { caching, origin } = rule?.if[1]

      expect(rulePaths).toContain('/style.css')
      expect(rulePaths).toContain('/static_asset.txt')

      expect(caching.max_age).toBe(FAR_FUTURE_TTL)
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
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
