import { STATIC_ORIGIN_NAME } from '@edgio/core/origins'
import StarterRoutes from '../src/StarterRoutes'
import { Router } from '@edgio/core/router'

describe('StarterRoutes', () => {
  let starterRoutes, router, rules

  beforeAll(() => {
    jest.isolateModules(() => {
      jest.resetModules()
      starterRoutes = new StarterRoutes()
      router = new Router().use(starterRoutes)
      rules = router.rules
    })
  })

  it('should add rule for service-worker', () => {
    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
    const { origin } = rule?.if[1]
    expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
  })

  it('should add rule for browser.js', async () => {
    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/__edgio__/:version/browser.js')
    const { origin, caching } = rule?.if[1]
    expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    expect(caching.max_age).toBe('1y')
    expect(caching.client_max_age).toBe('1y')
  })
})
