import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME, STATIC_ORIGIN_NAME } from '@edgio/core/origins'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'
import { join } from 'path'
import FastbootRoutes from '../../src/FastbootRoutes'

describe('router/FastbootRoutes.ts', () => {
  let originalDir, fastbootRoutes, router, rules

  beforeAll(() => {
    originalDir = process.cwd()
    process.chdir(join(__dirname, '..', 'apps', 'test'))
  })

  afterAll(() => {
    process.chdir(originalDir)
  })

  const init = () => {
    fastbootRoutes = new FastbootRoutes()
    router = new Router().use(fastbootRoutes)
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
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })

    it('should add rule for service-worker', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })
  })

  describe('development mode', () => {
    beforeEach(init)
    it('should render all pages with renderWithApp', async () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })
  })
})
