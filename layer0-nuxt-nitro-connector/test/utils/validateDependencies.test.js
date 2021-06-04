import * as packageUtils from '../../../core/src/utils/packageUtils'

describe('validateDependencies', () => {
  let validateDependencies, processExitMock, packageJson, log

  beforeEach(() => {
    jest.isolateModules(() => {
      jest.spyOn(packageUtils, 'read').mockImplementation(() => packageJson)
      log = jest.spyOn(console, 'log').mockImplementation()

      // catch process from exiting
      processExitMock = jest.spyOn(process, 'exit').mockImplementation(code => code)

      const moduleRef = require('../../src/utils/validateDependencies')
      validateDependencies = moduleRef.default
    })
  })

  it('should not exit if nitro is installed', () => {
    packageJson = {
      dependencies: {
        '@nuxt/nitro': 'latest',
      },
    }
    validateDependencies()
    expect(processExitMock).not.toHaveBeenCalled()
  })

  it('should raise an error and exit if nitro is not installed', () => {
    packageJson = {
      dependencies: {},
    }
    validateDependencies()
    expect(processExitMock).toHaveBeenCalled()
    expect(log.mock.calls[0][0]).toMatch(/Error: You must add "@nuxt\/nitro"/)
  })

  it('should not fail if there are no depedencies', () => {
    packageJson = {}
    validateDependencies()
    expect(processExitMock).toHaveBeenCalled()
    expect(log.mock.calls[0][0]).toMatch(/Error: You must add "@nuxt\/nitro"/)
  })
})
