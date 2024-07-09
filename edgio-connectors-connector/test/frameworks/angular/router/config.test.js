import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import { join } from 'path'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

describe('Angular send to serverless by default', () => {
  let AngularRoutes, angularRoutes, router, rules, mockOutputPath

  beforeAll(() => {
    mockOutputPath = 'dist/server'
    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('../../../../src/frameworks/angular/utils', () => ({
        getBuildPath: jest.fn(_ => 'public'),
        getOutputPath: jest.fn(_ => mockOutputPath),
      }))
      AngularRoutes = require('../../../../src/frameworks/angular/AngularRoutes').default
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it('should send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, '../apps/default'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }
    angularRoutes = new AngularRoutes()
    router = new Router().use(angularRoutes)
    rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    const { origin } = rule?.if[1]
    expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
  })

  it('should NOT send to serverless by default', async () => {
    const fs = createEdgioFS(join(__dirname, '../apps/no-serverless'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }
    angularRoutes = new AngularRoutes()
    router = new Router().use(angularRoutes)
    rules = router.rules

    const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
    expect(rule).toBe(undefined)
  })
})
