import * as packageUtils from '../../../core/src/utils/packageUtils'
import * as nuxtConfig from '@nuxt/config'

describe('updateDependencies', () => {
  // dependency structure on initial Nuxt project
  const origPackageJson = {
    scripts: {},
    dependencies: {
      nuxt: '^2.14.6',
    },
    devDependencies: {},
  }

  // dependency structure after initialized with Layer0
  const modifiedPackageJson = {
    scripts: {},
    dependencies: {
      '@nuxt/core': '^2.14.6',
    },
    devDependencies: { nuxt: '^2.14.6' },
  }

  let updateDependencies,
    validateDependencies,
    processExitMock,
    packageReadMock,
    packageWriteMock,
    packageJson

  beforeEach(() => {
    jest.isolateModules(() => {
      const moduleRef = require('../../src/utils/updateDependencies')
      updateDependencies = moduleRef.default
      validateDependencies = moduleRef.validateDependencies

      packageReadMock = jest.spyOn(packageUtils, 'read')
      packageWriteMock = jest
        .spyOn(packageUtils, 'write')
        .mockImplementation(content => (packageJson = JSON.parse(content)))

      // default empty Nuxt config
      jest.spyOn(nuxtConfig, 'loadNuxtConfig').mockImplementation(() => ({ modules: [] }))

      // catch process from exiting
      processExitMock = jest.spyOn(process, 'exit').mockImplementation(code => code)
    })
  })

  it('should exit for invalid Nuxt configuration', () => {
    packageReadMock.mockImplementationOnce(() => origPackageJson)
    validateDependencies()
    expect(processExitMock).toHaveBeenCalled()
  })

  it('should not exit for valid Nuxt configuration', () => {
    packageReadMock.mockImplementationOnce(() => modifiedPackageJson)
    validateDependencies()
    expect(processExitMock).not.toHaveBeenCalled()
  })

  it('should update Nuxt dependencies in package.json', async () => {
    let readResults

    packageReadMock
      // package as it would be with standard Nuxt install
      .mockImplementationOnce(() => origPackageJson)
      // package after dependencies updated
      .mockImplementationOnce(() => packageJson)

    await updateDependencies()
    readResults = packageReadMock.mock.results[0].value
    expect(readResults).toHaveProperty(['dependencies', 'nuxt'])
    expect(readResults).not.toHaveProperty(['dependencies', '@nuxt/core'])
    expect(readResults).not.toHaveProperty(['devDependencies', 'nuxt'])

    expect(packageJson).toHaveProperty(['dependencies', '@nuxt/core'])
    expect(packageJson).toHaveProperty(['devDependencies', 'nuxt'])

    // dependencies shouldn't be incorrectly updated if initialized again
    await updateDependencies()
    readResults = packageReadMock.mock.results[1].value
    expect(readResults).toHaveProperty(['dependencies', '@nuxt/core'])
    expect(readResults).not.toHaveProperty(['dependencies', 'nuxt'])

    expect(packageJson).toHaveProperty(['dependencies', '@nuxt/core'])
    expect(packageJson).toHaveProperty(['devDependencies', 'nuxt'])
    expect(packageWriteMock).toHaveBeenCalledTimes(2)
  })
})
