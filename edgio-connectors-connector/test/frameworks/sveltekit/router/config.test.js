import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import { join } from 'path'
import SvelteKitRoutes from '../../../../src/frameworks/sveltekit/SvelteKitRoutes'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

describe('sveltekit send to serverless by default', () => {
  it('should send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, '..', 'apps', 'default'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }

    const svelteKitRoutes = new SvelteKitRoutes()
    const router = new Router().use(svelteKitRoutes)
    const rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    const { origin } = rule?.if[1]
    expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
  })

  it('should NOT send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, '..', 'apps', 'no-serverless'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }

    const svelteKitRoutes = new SvelteKitRoutes()
    const router = new Router().use(svelteKitRoutes)
    const rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    expect(rule).toBe(undefined)
  })
})
