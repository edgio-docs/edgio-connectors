import { getAngularConfig, getAngularProject, getOutputPath } from '../../src/utils/getBuildPath'
import { join } from 'path'

describe('utils/getBuildPath.ts', () => {
  let originalDir = process.cwd()

  beforeAll(() => {
    process.chdir(join(__dirname, '..', 'apps', 'default'))
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
    expect(getOutputPath('build')).toBe('dist/my-edgio-angular-app/browser')
    expect(getOutputPath('server')).toBe('dist/my-edgio-angular-app/server')
  })
})
