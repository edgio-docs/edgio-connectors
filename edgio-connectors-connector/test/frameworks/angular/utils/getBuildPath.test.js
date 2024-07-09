import {
  getAngularConfig,
  getAngularProject,
  getOutputPath,
} from '../../../../src/frameworks/angular/utils'
import { join } from 'path'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

describe('utils/getBuildPath.ts', () => {
  let originalDir = process.cwd()

  beforeAll(() => {
    const fs = createEdgioFS(join(__dirname, '../apps/default'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode: false,
      isProductionBuild: true,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }
    process.chdir(fs.edgio.lambda.app.value)
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'debug').mockImplementation()
  })
  afterAll(() => process.chdir(originalDir))

  afterEach(() => {
    delete process.env.ANGULAR_PROJECT
  })

  it('should return angular config', () => {
    expect(getAngularConfig().defaultProject).toBe('my-edgio-angular-app')
  })

  it('should return angular project from config', () => {
    expect(getAngularProject()).toBe('my-edgio-angular-app')
  })

  it('should return angular project from environment variable', () => {
    process.env.ANGULAR_PROJECT = 'my-project'
    expect(getAngularProject()).toBe('my-project')
  })

  it('should return output path', () => {
    expect(getOutputPath('build')).toBe('public')
    expect(getOutputPath('server')).toBe('dist/my-edgio-angular-app/server')
  })
})
