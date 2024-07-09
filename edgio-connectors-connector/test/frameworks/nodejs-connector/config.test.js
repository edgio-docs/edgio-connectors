import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import { join } from 'path'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'
import { connectorRoutes } from '../../../src/index'

// NOTE: nodejs-connrctor is testing genric config for all connectors

describe('nodejs-connector send to serverless by default', () => {
  it('should send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, 'apps', 'default'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }
    const router = new Router().use(connectorRoutes)
    const rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    const { origin } = rule?.if[1]
    expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
  })

  it('should NOT send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, 'apps', 'no-serverless'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }

    const router = new Router().use(connectorRoutes)
    const rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    expect(rule).toBe(undefined)
  })
})
